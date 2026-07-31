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
// Three nested Object3D groups let idle motion, cursor turn, and scroll
// nod each own a single transform without fighting one another:
//
//   scrollGroup <- GSAP ScrollTrigger drives a small forward/downward nod on scroll (rotation.x)
//     tiltGroup <- damped pointer position drives a slight east/west turn (rotation.y)
//       idleGroup <- perpetual gentle side-to-side sway (position.x)
//         gltfScene (the loaded logo mesh, centered + normalized on load)
//
// This is the 3D chrome logo as the *only* hero art now. It intentionally
// does NOT include a continuous spin: rotating a real-time chrome material
// through a full turn sweeps its reflections across the entire HDRI and
// makes them shift/break up in a way a single baked poster image never has
// to deal with. The sway, cursor tilt, and scroll tilt are all small-angle/
// small-distance motions, so the reflections stay stable — this is meant to
// read as refined and slightly alive, not as the page's focal point
// (recruiters are here to look at the project case studies below it).
//
// Fallback strategy
// ------------------
// The hero markup still keeps the original <img class="hero-r"> poster/
// animated WebP in the DOM (see app.js for that src swap), but it's hidden
// by default now — see the CSS in styles.css. This module (or the
// prefers-reduced-motion media query directly) only reveals it if WebGL is
// unavailable, the visitor has `prefers-reduced-motion: reduce`, or either
// the model or the environment texture fails to load (e.g. the files simply
// haven't been added to /models or /textures yet). No loading spinners, no
// error states leak to the visitor either way.
// -----------------------------------------------------------------------------

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const MODEL_URL = 'models/rs-logo.glb';
const ENV_URL = 'textures/studio.exr';

// Tuning constants, kept together so the "refined, not the focal point"
// feel is easy to nudge without hunting through the render loop below.
const IDLE_SHIFT_WIDTH = 0.1; // world units, peak-to-peak horizontal sway
const IDLE_SHIFT_SPEED = 0.24; // cycles/sec — slow, gentle
const POINTER_TILT_MAX = 0.11; // radians (~6°) — a slight turn toward the cursor, not a dramatic one
const POINTER_DAMPING = 4; // higher = settles faster, lower = floatier
const SCROLL_TILT_DOWN_DEG = 4; // forward nod on scroll — even subtler than the cursor tilt above
const MODEL_TARGET_SIZE = 3.4; // world units the logo's on-screen (X/Y) size is normalized to

// Base orientation fix, in degrees, applied once after centering/scaling.
// The Blender file this .glb came from was modeled flat on the ground
// plane and extruded upward, so on export (Blender is Z-up, glTF is Y-up)
// the design's front face ends up pointing at the ceiling instead of the
// camera — i.e. "lying on its back". Rotating +90° about X stands it up
// to face the camera, matching assets/hero-r-poster.png. If it now faces
// away from the camera (you're looking at its back) flip this to -90; if
// it's on its side, try X: 0, Y: 90 instead.
const MODEL_ROTATION_OFFSET_DEG = { x: 90, y: 0, z: 0 };

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
  // Slightly under-exposed on purpose: a touch of darkness deepens the
  // shadow side of the chrome and makes the highlights read as brighter by
  // contrast, without actually clipping them — the same reason product
  // photography is rarely shot at a "neutral" exposure.
  renderer.toneMappingExposure = 0.88;
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
 * sways/tilts around its visual center regardless of how the origin was
 * set in Blender), normalizes its scale, applies the Blender-export
 * orientation fix, and upgrades every mesh to a polished-chrome
 * MeshPhysicalMaterial driven by the HDRI environment map.
 *
 * Centering is done via a nested pivot group rather than by offsetting the
 * model's own position directly. Object3D transforms compose as
 * translate * rotate * scale, so if the *same* object carried both the
 * "move bounding-box center to the origin" offset AND the normalize-scale
 * below, the offset would get scaled too and the model would end up
 * off-center (correct only in the special case scale === 1). Nesting the
 * raw offset one level below the scale/rotation avoids that: the child's
 * translation happens first, in unscaled space, exactly as measured.
 */
async function loadLogo(envMap) {
  const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
  const model = gltf.scene;

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center); // raw offset, measured and applied before any scale/rotation

  const pivot = new THREE.Group();
  pivot.add(model);

  // Normalize by the larger of the model's front-facing (X/Y) dimensions —
  // not a rotation-proof bounding sphere. That conservative sizing made
  // sense when the model spun through arbitrary angles (idle spin, pointer
  // tilt); now that the only motion is a small sway and an even smaller
  // scroll tilt, the model can safely fill the frame the way the flat
  // poster art did, with just a little headroom for that small motion.
  const size = box.getSize(new THREE.Vector3());
  const frameDimension = Math.max(size.x, size.y) || 1;
  pivot.scale.setScalar(MODEL_TARGET_SIZE / frameDimension);
  pivot.rotation.set(
    THREE.MathUtils.degToRad(MODEL_ROTATION_OFFSET_DEG.x),
    THREE.MathUtils.degToRad(MODEL_ROTATION_OFFSET_DEG.y),
    THREE.MathUtils.degToRad(MODEL_ROTATION_OFFSET_DEG.z)
  );

  model.traverse((child) => {
    if (!child.isMesh) return;
    // Smooth out faceted shading from the Blender extrude (recomputing
    // normals averages each vertex's adjacent face normals). If the design
    // has intentionally sharp creases this can over-soften them slightly —
    // if so, the real fix is Object > Shade Auto Smooth in Blender before
    // re-exporting, which lets you control that per-edge via angle/creases.
    child.geometry.computeVertexNormals();
    child.material = new THREE.MeshPhysicalMaterial({
      // A touch darker/cooler than near-white — reads as richer "dark
      // chrome" (titanium/gunmetal) rather than bright polished silver.
      // Metals use `color` as their reflectance tint, so this dims
      // everything slightly, highlights included; the extra lights below
      // are what keep the highlights punchy despite that.
      color: 0xd8dadd,
      metalness: 1,
      // A very flat, straight surface (like the R's vertical stroke) has a
      // single normal direction, so a near-mirror roughness gives it exactly
      // one sample of the HDRI — if that one point happens to be a dark
      // region, the whole surface reads as solid black, unlike the curved
      // swirls whose constantly-varying normals always catch a highlight
      // somewhere. 0.34 blurs the reflection enough to blend in neighboring
      // brighter areas on flat surfaces (tuned at the current camera
      // distance/MODEL_TARGET_SIZE — moving either changes the reflection
      // angle on that flat stroke and may need this re-tuned) without
      // reading as noticeably softer on the curved parts of the design.
      roughness: 0.34,
      envMap,
      envMapIntensity: 1.2,
      clearcoat: 0.4,
      clearcoatRoughness: 0.25,
      // Double-sided so no backface gaps show through thin extruded
      // sections as the logo sways/tilts (a single static angle can hide a
      // gap that a different one reveals).
      side: THREE.DoubleSide,
    });
  });

  return pivot;
}

/**
 * A small accent-light rig on top of the HDRI's image-based lighting. The
 * env map alone tends to read as a uniform, slightly flat grey on metal —
 * real product-photography chrome shots use several lights at different
 * angles and color temperatures to paint distinct highlight bands across
 * the curves, which is what actually reads as "depth" (more than material
 * color or size do). A warm key + cool rim, opposite each other, is the
 * minimal version of that: it gives the eye two separate light sources to
 * track across the surface instead of one soft blur.
 */
function createLightRig() {
  const rig = new THREE.Group();

  const key = new THREE.DirectionalLight(0xfff1de, 0.55); // warm, upper-front-right
  key.position.set(2.2, 2.6, 3.2);
  rig.add(key);

  const rim = new THREE.DirectionalLight(0xcfe2ff, 0.5); // cool, back-left — separates the silhouette
  rim.position.set(-3, 1.2, -2.4);
  rig.add(rim);

  const fill = new THREE.DirectionalLight(0xffffff, 0.18); // very low — lifts the shadow side just slightly
  fill.position.set(-2, -1.5, 2.5);
  rig.add(fill);

  return rig;
}

/**
 * Exponential, framerate-independent damping: smoothly moves `current`
 * toward `target` regardless of the delta between frames, avoiding the
 * classic `current += (target - current) * 0.1` trap that runs at
 * different effective speeds on a 60Hz vs. 120Hz display.
 */
function damp(current, target, lambda, dt) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
}

/**
 * A slight, damped turn toward the cursor — tracks normalized horizontal
 * pointer position across the viewport and rotates around the *vertical*
 * (Y) axis toward it.
 *
 * This is deliberately not a rotation.x/rotation.z lean. Tilting front-to-
 * back or rolling side-to-side keeps the same face pointed at the camera
 * the whole time — on a flat-ish extruded shape like this one, that reads
 * as the image sliding around, not as an actual object. Turning around Y
 * swings the model's real depth (its extruded thickness) in and out of
 * view as it turns east/west, which is what actually sells it as
 * three-dimensional.
 */
function createPointerTilt() {
  const pointer = { x: 0 }; // raw, -1..1
  const turn = { y: 0 }; // damped, applied to tiltGroup each frame

  window.addEventListener(
    'pointermove',
    (event) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    },
    { passive: true }
  );

  return {
    update(tiltGroup, dt) {
      const targetY = pointer.x * POINTER_TILT_MAX; // turns to "look" toward the cursor, east/west
      turn.y = damp(turn.y, targetY, POINTER_DAMPING, dt);
      tiltGroup.rotation.y = turn.y;
    },
  };
}

/**
 * Ties a small forward/downward nod to hero-section scroll progress via GSAP
 * ScrollTrigger. Rotating -X tips the top of the model away from the camera
 * (and the bottom toward it) — a gentle "look down" as the visitor scrolls
 * past, rather than a spin around.
 */
function setupScrollAnimation({ heroSection, scrollGroup }) {
  gsap.registerPlugin(ScrollTrigger);

  const scrollTrigger = ScrollTrigger.create({
    trigger: heroSection,
    start: 'top top',
    end: 'bottom top',
    scrub: 1, // ~1s smoothing lag between scroll input and the animated value
    onUpdate(self) {
      scrollGroup.rotation.x = THREE.MathUtils.degToRad(-SCROLL_TILT_DOWN_DEG) * self.progress;
    },
  });

  return scrollTrigger;
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
  const heroSection = document.querySelector('.hero');
  const container = document.querySelector('.hero-art');
  const canvas = document.querySelector('.hero-canvas');
  const poster = document.querySelector('.hero-r');

  if (!heroSection || !container || !canvas) return; // structurally missing — nothing sensible to do

  // Reduced-motion visitors never get the 3D scene at all; CSS alone
  // reveals the poster/WebP for them (see the media query in styles.css).
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  if (!isWebGLAvailable()) {
    poster?.classList.add('is-fallback-visible');
    return;
  }

  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 6.1); // scaled up with MODEL_TARGET_SIZE to keep the same framing margin
  scene.add(createLightRig());

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
    // not added yet, or a 404 on either) — bail out quietly and reveal the
    // 2D fallback. See the two README files this feature ships with, in
    // /models and /textures, for what belongs at each path.
    console.warn('[hero-logo] falling back to 2D hero art:', err);
    poster?.classList.add('is-fallback-visible');
    renderer.dispose();
    return;
  }

  const resizeObserver = setupResize(renderer, camera, container);
  const pointerTilt = createPointerTilt();
  const scrollTrigger = setupScrollAnimation({ heroSection, scrollGroup });

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

    idleGroup.position.x = Math.sin(t * IDLE_SHIFT_SPEED * Math.PI * 2) * (IDLE_SHIFT_WIDTH / 2);
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
