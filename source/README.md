# WhisperTriage AI

Offline-first, on-device triage assistant for zero-connectivity disaster
response. Runs entirely in the browser (React + Canvas) with no
backend, no cloud API calls, and — as of this version — no downloaded
AI model either. Hosted as a static site on GitHub Pages.

## What it does

1. Capture a photo of a patient or scene via the device camera (or upload).
2. `src/ai/visionHeuristics.js` analyzes the photo directly via
   `<canvas>` pixel math: redness ratio, dark/charred-tissue ratio, and
   texture (hue) irregularity. This is pure arithmetic over pixel data
   — no model download, no WASM runtime, no network fetch of any kind.
3. The operator confirms or overrides the heuristic's coarse suggestion
   with a field triage assessment (START protocol: Immediate / Delayed
   / Minor / Expectant).
4. GPS coordinates, timestamp, category, and finding are bit-packed
   into a compact string (well under 100 bytes) and rendered as a QR
   code for device-to-device scanning, SMS relay, or radio read-out.

## Why not a downloaded vision model

An earlier version used `@xenova/transformers` to run a quantized
ONNX model in-browser. In practice, that depends on two things a
static host like GitHub Pages doesn't control: the Hugging Face CDN
being reachable from the visiting device/network, and
`onnxruntime-web`'s WASM backend initializing correctly (multi-threaded
WASM often wants cross-origin-isolation headers GitHub Pages doesn't
set). Both failed in real-world testing on GitHub Pages. Canvas pixel
heuristics have no such dependency — nothing to download, nothing that
can fail to load, works identically in every browser.

## Honest scope note

The heuristic is a coarse color/texture signal, not a trained
classifier and not a diagnosis. `src/ai/triageEngine.js` treats it as
one input signal and always lets the operator's manual selection take
priority — the app is a documentation/compression/transmission aid,
not an autonomous diagnostic device.

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Outputs a fully static site to `dist/`. `vite.config.js` sets
`base: './'` so every asset reference is relative — this is required
for GitHub Pages, which serves the site from
`https://<username>.github.io/<repository-name>/` rather than a domain
root.

## Deploying to GitHub Pages

**`index.html` must sit at the root of whatever GitHub Pages serves.**
Pages serves files exactly as given — it does not run a build step for
you. Two options:

**Option A — push `dist/` contents directly (simplest)**
1. Run `npm run build`.
2. Push the *contents* of `dist/` (not the `dist` folder itself) to
   the branch/folder Settings → Pages is configured to serve, so
   `index.html` lands directly at that root.

**Option B — GitHub Actions (automatic on every push)**
This repo includes `.github/workflows/deploy.yml`. Push the full
source to `main`, set Settings → Pages → Source to "GitHub Actions",
and it builds and deploys `dist/` automatically on every push.

## Project structure

```
whispertriage/
├── .github/workflows/deploy.yml   # Optional CI/CD to GitHub Pages
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── sw.js                      # Offline service worker
│   └── icons/                     # PWA home-screen icons
├── src/
│   ├── ai/
│   │   ├── visionHeuristics.js    # Canvas pixel-analysis (redness/char/texture)
│   │   └── triageEngine.js        # START-protocol classification logic
│   ├── components/
│   │   ├── CameraModule.jsx       # Camera capture / upload fallback
│   │   ├── SeveritySlider.jsx     # Manual operator override
│   │   └── QROutput.jsx           # QR code + raw payload display
│   ├── utils/
│   │   ├── encoder.js             # Bit-packing payload compression
│   │   ├── geoHandler.js          # Geolocation API wrapper
│   │   └── imageCompressor.js     # Canvas-based image resizing
│   ├── App.jsx                    # Application flow / state machine
│   ├── App.css / index.css        # Styling
│   └── main.jsx                   # React mount + SW registration
├── vite.config.js                 # base: './' for GitHub Pages
└── package.json
```
