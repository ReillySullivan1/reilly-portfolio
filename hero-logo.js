// -----------------------------------------------------------------------------
// hero-logo.js
//
// Renders the RS logo (models/rs-logo.glb) as a polished-chrome 3D object
// inside the homepage hero, lit by a studio HDRI (textures/studio.exr).
//
// Loaded as a native ES module via the <script type="importmap"> in
// index.html — no bundler, no build step, consistent with the rest of this
// project (see CLAUDE.md: "plain HTML/CSS/JS, no build step").
//
// Layered animation model
// ------------------------
// Three nested Object3D groups let idle motion, pointer tilt, and scroll
// rotation each own a single transform without fighting one another:
//
//   scrollGroup   <- GSAP ScrollTrigger drives rotation.y (~30°) on scroll
//     tiltGroup   <- damped pointer position drives rotation.x / rotation.z
//       idleGroup <- perpetual slow spin (rotation.y) + gentle float (position.y)
//         gltfScene (the loaded logo mesh, centered + normalized on load)
//
// Fallback strategy
// ------------------
// The hero markup keeps its original <img class="hero-r"> poster/animated
// WebP underneath the canvas (see app.js for that swap). If WebGL is
// unavailable, the visitor has `prefers-reduced-motion: reduce`, or either
// the model or the environment texture fails to load (e.g. the files simply
// haven't been added to /models or /textures yet), this module quietly does
// nothing further — the canvas is never revealed and the existing 2D art
// keeps doing its job. No loading spinners, no error states leak to the
// visitor.
// -----------------------------------------------------------------------------

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const MODEL_URL = 'models/rs-logo.glb';
const ENV_URL = 'textures/studio.exr';

// Tuning constants, kept together so the "premium but subtle" feel is easy
// to nudge without hunting through the render loop below.
const IDLE_FLOAT_HEIGHT = 0.06; // world units, peak-to-peak vertical drift
const IDLE_FLOAT_SPEED = 0.35; // cycles/sec — slow
const IDLE_SPIN_SPEED = 0.05; // radians/sec — slow, continuous
const POINTER_TILT_MAX = 0.18; // radians (~10°) max tilt toward the cursor
const POINTER_DAMPING = 4.5; // higher = settles faster, lower = floatier
const SCROLL_ROTATION_DEG = 30; // total scroll-driven spin, within the 20-40° brief
const SCROLL_CAMERA_DRIFT = 0.35; // world units of camera dolly across the scroll range
const MODEL_TARGET_SIZE = 1.6; // world units the logo's largest dimension is normalized to

/**
 * Exponential, framerate-independent damping: smoothly moves `current`
 * toward `target` regardless of the delta between frames, avoiding the
 * classic `current += (target - current) * 0.1` trap that runs at
 * different effective speeds on a 60Hz vs. 120Hz display.
 */
function damp(current, target, lambda, dt) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
}

/** Feature-detects a usable WebGL context before we spend anything on setup. */
function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

/** Builds the renderer with the transparent / filmic / physically-based setup the design calls for. */
function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true, // transparent background — the page background shows through
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); // cap for perf/battery
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Note: physically-correct light falloff has been three.js's default
  // behavior since r155 (the old `useLegacyLights` switch was removed) —
  // no extra flag is needed here.
  return renderer;
}

/** Loads the studio EXR and pre-filters it into a PMREM environment map for realistic chrome reflections. */
async function loadEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envTexture = await new EXRLoader().loadAsync(ENV_URL);
  const envMap = pmrem.fromEquirectangular(envTexture).texture;
  envTexture.dispose();
  pmrem.dispose();
  return envMap;
}

/**
 * Loads the logo GLB, recenters it on its own bounding-box middle (so it
 * spins/floats around its visual center regardless of how the origin was
 * set in Blender), normalizes its scale, and upgrades every mesh to a
 * polished-chrome MeshPhysicalMaterial driven by the HDRI environment map.
 */
async function loadLogo(envMap) {
  const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
  const model = gltf.scene;

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);

  const size = box.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z) || 1;
  model.scale.setScalar(MODEL_TARGET_SIZE / maxDimension);

  model.traverse((child) => {
    if (!child.isMesh) return;
    child.material = new THREE.MeshPhysicalMaterial({
      color: 0xf2f2f2,
      metalness: 1,
      roughness: 0.14,
      envMap,
      envMapIntensity: 1.2,
      clearcoat: 0.4,
      clearcoatRoughness: 0.25,
    });
  });

  return model;
}

/** A very low, cool-tinted fill light so the chrome reads with a crisp specular edge even on a flat HDRI. */
function createFillLight() {
  const light = new THREE.DirectionalLight(0xffffff, 0.4);
  light.position.set(-2, 3, 4);
  return light;
}

/** Pointer tilt: tracks normalized cursor position across the viewport and damps toward it every frame. */
function createPointerTilt() {
  const pointer = { x: 0, y: 0 }; // raw, -1..1
  const tilt = { x: 0, z: 0 }; // damped, applied to tiltGroup each frame

  window.addEventListener(
    'pointermove',
    (event) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
    },
    { passive: true }
  );

  return {
    update(tiltGroup, dt) {
      const targetX = -pointer.y * POINTER_TILT_MAX; // tilts up/down toward the cursor
      const targetZ = pointer.x * POINTER_TILT_MAX; // leans left/right toward the cursor
      tilt.x = damp(tilt.x, targetX, POINTER_DAMPING, dt);
      tilt.z = damp(tilt.z, targetZ, POINTER_DAMPING, dt);
      tiltGroup.rotation.x = tilt.x;
      tiltGroup.rotation.z = tilt.z;
    },
  };
}

/** Ties logo rotation and a slight camera drift to hero-section scroll progress via GSAP ScrollTrigger. */
function setupScrollAnimation({ heroSection, scrollGroup, camera }) {
  gsap.registerPlugin(ScrollTrigger);

  const baseCameraZ = camera.position.z;
  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: heroSection,
      start: 'top top',
      end: 'bottom top',
      scrub: 1, // ~1s smoothing lag between scroll input and the animated value
    },
  });

  timeline
    .to(scrollGroup.rotation, { y: THREE.MathUtils.degToRad(SCROLL_ROTATION_DEG), ease: 'none' }, 0)
    .to(camera.position, { z: baseCameraZ - SCROLL_CAMERA_DRIFT, y: '+=0.12', ease: 'none' }, 0);

  return timeline.scrollTrigger;
}

/** Keeps the renderer's drawing buffer and the camera's aspect ratio in sync with the canvas's on-screen size. */
function setupResize(renderer, camera, container) {
  const resize = () => {
    const { clientWidth: width, clientHeight: height } = container;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false); // false: CSS (not the drawing buffer) controls display size
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  return observer;
}

async function init() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const heroSection = document.querySelector('.hero');
  const container = document.querySelector('.hero-art');
  const canvas = document.querySelector('.hero-canvas');

  if (reduceMotion || !heroSection || !container || !canvas || !isWebGLAvailable()) {
    return; // static poster / animated-WebP fallback (see app.js) stays as the whole experience
  }

  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 4.2);
  scene.add(createFillLight());

  // Group hierarchy — see file header for why each animation layer owns
  // exactly one transform.
  const scrollGroup = new THREE.Group();
  const tiltGroup = new THREE.Group();
  const idleGroup = new THREE.Group();
  scrollGroup.add(tiltGroup);
  tiltGroup.add(idleGroup);
  scene.add(scrollGroup);

  try {
    const envMap = await loadEnvironment(renderer);
    scene.environment = envMap; // image-based lighting — this alone gives the chrome its reflections
    const model = await loadLogo(envMap);
    idleGroup.add(model);
  } catch (err) {
    // Missing/broken assets (e.g. models/rs-logo.glb or textures/studio.exr
    // not added yet, or a 404 on either) — bail out quietly and leave the
    // 2D fallback visible. See the two README files this feature ships
    // with, in /models and /textures, for what belongs at each path.
    console.warn('[hero-logo] falling back to 2D hero art:', err);
    renderer.dispose();
    return;
  }

  const resizeObserver = setupResize(renderer, camera, container);
  const pointerTilt = createPointerTilt();
  const scrollTrigger = setupScrollAnimation({ heroSection, scrollGroup, camera });

  // Render only while the hero is actually on screen and the tab is in the
  // foreground: `renderer.setAnimationLoop(null)` fully stops the render
  // loop (not just skips frames), so an idle background tab or a hero
  // that's scrolled out of view costs nothing — this is what "preserve
  // battery life" / "render only when necessary" mean in practice for a
  // perpetually-animating idle state.
  const clock = new THREE.Clock();
  let inViewport = true;

  const tick = () => {
    const dt = Math.min(clock.getDelta(), 1 / 30); // clamp long pauses (tab switches, etc.)
    const t = clock.elapsedTime;

    idleGroup.position.y = Math.sin(t * IDLE_FLOAT_SPEED * Math.PI * 2) * (IDLE_FLOAT_HEIGHT / 2);
    idleGroup.rotation.y += IDLE_SPIN_SPEED * dt;
    pointerTilt.update(tiltGroup, dt);

    renderer.render(scene, camera);
  };

  const shouldRun = () => inViewport && document.visibilityState === 'visible';
  const syncAnimationLoop = () => renderer.setAnimationLoop(shouldRun() ? tick : null);

  const visibilityObserver = new IntersectionObserver(
    ([entry]) => {
      inViewport = entry.isIntersecting;
      syncAnimationLoop();
    },
    { threshold: 0 }
  );
  visibilityObserver.observe(container);
  document.addEventListener('visibilitychange', syncAnimationLoop);

  syncAnimationLoop();
  canvas.classList.add('is-ready'); // CSS cross-fades the canvas in over the poster

  // Teardown, in case this ever runs inside something that unmounts pages
  // client-side; harmless to leave registered on this static multi-page site.
  window.addEventListener(
    'pagehide',
    () => {
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener('visibilitychange', syncAnimationLoop);
      scrollTrigger?.kill();
      renderer.dispose();
    },
    { once: true }
  );
}

init();
