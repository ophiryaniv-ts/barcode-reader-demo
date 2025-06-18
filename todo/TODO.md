Familiarize yourself with the current implementation

---

## Project Bootstrap

- [x] Initialize Vite project scaffold with TypeScript support (`npm create vite@latest barcode-reader-demo -- --template vanilla-ts`).
- [x] Set up basic directory structure: `src/index.html`, `src/main.ts`, `src/scanner.ts`, `src/sw.ts`.
- [x] Add ESLint + Prettier with Airbnb style guide and configure CI lint step.
- [x] Install primary runtime dependencies:
  - `@zxing/browser` (initial barcode decoding)
  - `workbox-window` (service-worker helpers)
- [x] Install development & testing dependencies:
  - `vitest`, `@vitest/coverage-v8`
  - `playwright`, `@playwright/test`
  - `typescript`, `vite`, `ts-node`, `tsx`

## Core Feature Implementation

1. Landing Page
   - [x] Create minimal responsive landing page containing a single **"Open Camera"** button.
   - [x] Ensure high-contrast styling & keyboard accessibility.
2. Camera & Scanning Loop
   - [x] Implement `getUserMedia({ video: { facingMode: "environment" }})` request.
   - [x] Display real-time video preview (60 fps target) in `<video>` element.
   - [ ] Offload frame sampling & barcode decoding (~10 fps) to a _Web Worker_ to preserve UI FPS. (Current implementation runs on main thread)
   - [x] Support QR and PDF417 formats using `@zxing/browser` API.
3. Decode Handling
   - [x] On first successful decode:
     - [x] Stop media tracks & worker loop.
     - [x] Capture current frame to `<canvas>` ➜ thumbnail image.
     - [x] Render decoded text; hyperlink if URL.
   - [x] Provide **"Scan again"** button to restart the process.

## PWA & Offline Support

- [x] Add `manifest.webmanifest` (name, short_name, icons 192/512 px, theme colors).
- [x] Integrate basic Service Worker to precache static assets (cache-first) and enable offline mode.
- [x] Register Service Worker in `main.ts`; include update flow.
- [ ] Evaluate whether to surface install prompt (deferred decision).

## Accessibility & UX Enhancements

- [ ] Label controls for screen readers.
- [ ] Confirm focus management after navigating between scan & result views.
- [ ] Prepare i18n strings for future localization.

## Performance Targets

- [ ] Benchmark decode latency on mid-range Android/iOS; aim ≤150 ms average.
- [ ] Optimize canvas sampling resolution and ZXing decoder settings.
- [ ] Consider throttling frame rate or dynamic resolution based on device capability.

## Testing Strategy

- Unit Tests (Vitest)
  - [x] Utility functions (e.g., URL detection, throttling helpers).
- Integration Tests
  - [ ] Mock camera stream with prerecorded video to validate single decode event.
- E2E Tests (Playwright)
  - [ ] Emulate iPhone & Pixel devices; assert QR & PDF417 scans succeed.
- [x] Configure coverage threshold ≥90% for utilities.

## Continuous Integration / Deployment

- [ ] GitHub Actions workflow: `lint → unit tests → build → headless E2E`.
- [ ] Auto-deploy production build to GitHub Pages (or Netlify) on `main`.

## PDF417 Accuracy Evaluation

- [ ] Gather sample low-quality PDF417 images.
- [ ] Measure success rate vs. ZXing; document failure cases.
- [ ] If accuracy < target threshold, research Dynamsoft SDK fallback (cost, licensing, integration complexity).

## Image Upload Feature Implementation

- [x] Add file input for image upload
- [x] Implement image preview functionality (via canvas thumbnail)
- [x] Add barcode scanning from uploaded images
- [x] Handle different image formats (PNG, JPEG, WebP)
- [x] Add drag & drop interface for better UX
- [x] Error handling for unsupported formats/no barcode found

## Logging System Implementation ✅

- [x] Create comprehensive logger utility with categories and levels
- [x] Add structured logging throughout the application
- [x] Include performance timing and error tracking
- [x] Implement console styling and grouping
- [x] Add session storage for log persistence
- [x] Provide global access for debugging

## Future Considerations

- [x] Decide on analytics or offline logging strategy (✅ Implemented comprehensive logging)
- [ ] Advanced performance tuning (WebAssembly SIMD, WebCodecs when broadly supported).

## Barcode Library Comparison Roadmap

### 1. Library Discovery & Evaluation

- [ ] Research additional JavaScript barcode-reader libraries supporting QR & PDF417 (plus other 1D/2D formats).
  - `quagga2` (JS + optional WASM)
  - `zxing-wasm` (pure WASM build of ZXing)
  - Native `BarcodeDetector` (Chrome / Edge)
  - `@dynamsoft/barcode-reader` (commercial, trial license)
  - _Optional_: `jsQR` (QR-only) for baseline
- [ ] For each candidate capture:
  - Supported symbologies
  - License (MIT, GPL, commercial)
  - Bundle size (min + gzip)
  - Typical decode latency (desktop + mid-range mobile)
  - Camera stream FPS impact

### 2. Codebase Refactor for Pluggable Scanners

1. Establish a common TypeScript interface in `src/scanners/IBarcodeProvider.ts`:
   ```ts
   export interface IBarcodeProvider {
     name: string; // e.g. "ZXing", "Quagga2"
     init(): Promise<void>; // Any async WASM setup
     scanVideoFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<string | null>;
     scanImage(image: HTMLImageElement | HTMLCanvasElement): Promise<string | null>;
     destroy?(): void; // Cleanup if needed
   }
   ```
2. Move current `BarcodeScanner` logic into `providers/zxingProvider.ts` implementing the interface.
3. Add skeleton provider files for:
   - `quaggaProvider.ts`
   - `zxingWasmProvider.ts`
   - `barcodeDetectorProvider.ts`
   - `dynamsoftProvider.ts`
4. Create `ProviderRegistry` that lazily loads a provider on demand (dynamic `import()` to keep bundle size low).
5. Update `BarcodeApp` to allow provider selection (dropdown on landing page).
6. Persist last-used provider in `localStorage`.

### 3. UI Changes

- [ ] Add provider selector component with description + link to docs.
- [ ] Show badge of currently active engine in scanner & result pages.
- [ ] Display decode latency for each scan (use `performance.now()` timing).

### 4. Benchmark Harness

- [ ] Add `BenchmarkRunner` utility:
  - Feeds a fixed set of sample images / prerecorded video to each provider.
  - Measures success rate & average latency.
  - Outputs table in console + downloadable JSON.
- [ ] Provide CLI script (`npm run benchmark`) using Node + `canvas` to run headless benchmarks.

### 5. Documentation for Junior Dev

- [ ] Write `docs/providers.md` explaining interface contract & how to add a new library.
- [ ] For each provider skeleton include `TODO:` comments where implementation is required.
- [ ] Update README with comparison goals and how to switch engines.

### 6. Stretch Goals

- [ ] Automated Playwright E2E running same test across engines.
- [ ] Graphical charts of benchmark results (Chart.js).
- [ ] Toggle to run all engines in parallel & show side-by-side results.
