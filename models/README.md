# models/

Drop your exported logo here as:

```
rs-logo.glb
```

Referenced by `hero-logo.js` via `MODEL_URL = 'models/rs-logo.glb'`.

Notes for the Blender export:
- Export as `.glb` (binary glTF), not `.gltf` + separate files.
- Apply all transforms before export so scale/rotation are baked in.
- The material on the mesh doesn't matter much — `hero-logo.js` replaces
  every mesh's material with its own polished-chrome `MeshPhysicalMaterial`
  at load time, so you don't need to hand-author a chrome shader in Blender.
- Keep it reasonably light (well under 5MB) for fast load on the homepage.
