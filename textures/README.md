# textures/

Drop your studio environment map here as:

```
studio.exr
```

Referenced by `hero-logo.js` via `ENV_URL = 'textures/studio.exr'`, loaded
with three.js's `EXRLoader` and prefiltered through a `PMREMGenerator` for
the chrome logo's reflections. It is never shown directly as a background —
only used as lighting/reflection data — so a modest resolution (~1-2K
equirectangular) is plenty and keeps load time fast.
