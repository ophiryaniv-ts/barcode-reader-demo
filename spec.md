# Barcode Web App Specification (v0.1)

## Why

• Provide an offline-capable mobile web app to quickly scan QR and PDF417 barcodes on Android & iOS—no native install required.  
• Prefer open-source tooling; allow a commercial fallback only if it measurably improves PDF417 accuracy.

## What

1. Core Features  
   – Landing page with a single “Open Camera” button.  
   – Rear-camera video preview.  
   – Real-time detection of QR & PDF417 barcodes.  
   – On first valid decode:  
    • Stop camera & scanning loop.  
    • Show captured frame thumbnail.  
    • Display decoded text (URL rendered as link).  
   – “Scan again” resets the process.

2. Progressive Web App  
   – Works offline via Service Worker caching.  
   – Optional home-screen installation (awaiting confirmation).

3. Device Support  
   – Chrome, Safari, Firefox on Android/iOS (latest two major versions).

4. Accessibility & UX  
   – High-contrast controls, clear permission prompts, keyboard-accessible buttons.  
   – Ready for future localization.

5. Performance  
   – Target 60 fps preview; ≤150 ms average decode latency on mid-range devices.

6. Security & Privacy  
   – All processing client-side; no images leave the device.

## How (Step-by-Step Blueprint)

1. Stack  
    – TypeScript (ES2022), Vite bundler.  
    – Barcode library: start with `@zxing/browser` or `zxing-wasm`
   ; evaluate Dynamsoft SDK if PDF417 success rate is inadequate.  
    – Testing: Vitest/Jest (unit), Playwright (E2E), manual device matrix.

2. App Structure  
   – `src/index.html`, `src/main.ts`, `src/scanner.ts`, `src/sw.ts`.  
   – Service Worker via Workbox; simple CSS.

3. Workflow  
   a. Click ➜ `getUserMedia({ video: { facingMode: "environment" }})`.  
   b. Attach stream to `<video>`; sample frames to `<canvas>`.  
   c. Decode at ~10 fps in a worker to balance CPU.  
   d. On decode success: stop tracks ➜ capture frame ➜ show image & text.  
   e. “Scan again” restarts stream.

4. Offline / PWA  
   – `manifest.webmanifest` with name, icons (192 px & 512 px), theme colors.  
   – Cache-first strategy for static assets; network fallback optional.  
   – Install prompt & icon behavior pending decision.

5. Build & CI  
   – GitHub repo with ESLint & Prettier.  
   – GitHub Actions: lint → unit tests → build → headless E2E.  
   – Deploy to GitHub Pages / Netlify.

6. Tests & Acceptance Criteria  
   – Unit: utility logic, scan-loop state changes.  
   – Integration: mock camera stream with prerecorded video; assert single decode event.  
   – E2E: Playwright on iPhone/Pixel emulators scanning sample QR & PDF417 images.  
   – Manual checklist covering real devices, orientation changes, permission denial, offline mode.

## Open Questions

1. Should the PWA actively show an install prompt with custom icon, or silently provide offline caching only?
2. Is a commercial library an acceptable fallback if open-source PDF417 decoding fails in low-quality conditions?
3. Any localization (multiple languages) needed at launch?
4. Do we require analytics or offline logging of scan events?

---

When you approve this spec, I’ll create `todo/TODO.md` starting with “Familiarize yourself with the current implementation” and break down the tasks accordingly.
