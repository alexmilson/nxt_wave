# WhisperTriage AI — Ready to Deploy

**Everything at this top level is the already-built, ready-to-serve website.**
No build step needed. Push the contents of this folder (as they are,
including `.nojekyll`) to whatever GitHub Pages is serving — repo root
on the `main`/`gh-pages` branch, or wherever Settings → Pages points —
and it will work immediately.

```
(this folder)/
├── index.html          ← entry point, must sit at the served root
├── assets/              ← compiled JS + CSS bundle (223 KB total)
├── manifest.json        ← PWA manifest
├── sw.js                 ← offline service worker
├── icons/, favicon.svg, icons.svg
├── .nojekyll             ← tells GitHub Pages to skip Jekyll processing
└── source/               ← full editable project source (NOT deployed as-is)
```

## Deploying (do this exactly)

1. Create/open your GitHub repository (e.g. `nxt_wave`).
2. Copy **everything in this folder except the `source/` subfolder**
   into the repo, at the root of the branch/folder that Settings →
   Pages is configured to serve. `index.html` must end up directly at
   that root — e.g. `your-repo/index.html`, not
   `your-repo/dist/index.html` or `your-repo/whispertriage/index.html`.
3. Commit and push.
4. Visit `https://<your-username>.github.io/<repo-name>/`.

That's it — no `npm install`, no `npm run build`, no first-load model
download of any kind.

## What changed from the earlier version

The first version downloaded a quantized ONNX vision model in-browser
via `@xenova/transformers`, which failed on GitHub Pages — it depends
on the Hugging Face CDN being reachable and on `onnxruntime-web`'s WASM
backend initializing correctly, neither of which GitHub Pages
guarantees (no control over CORS or cross-origin-isolation headers).

This version replaces that with **pure `<canvas>` pixel-analysis
heuristics** (`source/src/ai/visionHeuristics.js`) — HSV-based redness,
dark/charred-tissue, and hue-texture detection computed directly on
the photo, entirely synchronously, with zero network calls and nothing
that can fail to "load." Bundle size dropped from ~1 MB to 223 KB as a
result. It's a coarser signal than a trained model, and the app is
upfront about that in the UI and in `source/README.md` — but it now
works reliably on every load, every network condition, every browser.

## If you want to change the code later

The `source/` folder has the full, editable React project along with
its own `README.md` covering local development and rebuilding. After
editing, run:

```bash
cd source
npm install
npm run build
```

Then copy the new contents of `source/dist/` back to this top level
(replacing `index.html`, `assets/`, etc.) and redeploy.
