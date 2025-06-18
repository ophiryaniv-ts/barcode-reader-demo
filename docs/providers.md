# Barcode Provider System

The barcode scanner application now supports multiple scanning engines through a pluggable provider system. This allows for easy comparison of different barcode libraries and their performance characteristics.

## Architecture Overview

### Core Components

1. **IBarcodeProvider Interface** (`src/scanners/IBarcodeProvider.ts`)

   - Defines the contract that all barcode providers must implement
   - Provides standard methods for initialization, scanning, and cleanup

2. **ProviderRegistry** (`src/scanners/ProviderRegistry.ts`)

   - Singleton registry that manages all available providers
   - Handles dynamic loading of providers to keep bundle size minimal
   - Manages provider switching and cleanup

3. **Provider Implementations** (`src/scanners/providers/`)
   - Each provider is implemented as a separate class
   - Providers are loaded on-demand using dynamic imports
   - Currently available providers:
     - **ZXing**: Fast and reliable, supports QR codes and PDF417
     - **BarcodeDetector**: Native browser API (Chrome/Edge only)
     - **Quagga2**: (skeleton implementation - requires package installation)

## Adding a New Provider

To add a new barcode scanning library, follow these steps:

### 1. Install Dependencies

```bash
npm install your-barcode-library
```

### 2. Create Provider Implementation

Create a new file `src/scanners/providers/yourProvider.ts`:

```typescript
import type { IBarcodeProvider } from '../IBarcodeProvider';
import { logger } from '../../logger';
// Import your barcode library
import YourBarcodeLibrary from 'your-barcode-library';

export class YourProvider implements IBarcodeProvider {
  public readonly name = 'YourProvider';
  private scanner: YourBarcodeLibrary | null = null;

  async init(): Promise<void> {
    logger.info('YourProvider', 'Initializing YourProvider');
    try {
      this.scanner = new YourBarcodeLibrary(/* config */);
      logger.debug('YourProvider', 'YourProvider initialized successfully');
    } catch (error) {
      logger.error('YourProvider', 'Failed to initialize YourProvider', error as Error);
      throw error;
    }
  }

  async scanVideoFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<string | null> {
    if (!this.scanner) {
      throw new Error('YourProvider not initialized');
    }

    // Implement video frame scanning logic
    // Return the decoded barcode text or null if no barcode found
  }

  async scanImage(image: HTMLImageElement | HTMLCanvasElement): Promise<string | null> {
    if (!this.scanner) {
      throw new Error('YourProvider not initialized');
    }

    // Implement image scanning logic
    // Return the decoded barcode text or null if no barcode found
  }

  destroy?(): void {
    logger.debug('YourProvider', 'Destroying YourProvider');
    // Cleanup resources
    this.scanner = null;
  }
}
```

### 3. Add Logger Category

Add your provider to the logger types in `src/logger.ts`:

```typescript
export type LogCategory = '...' | 'YourProvider';
```

And add styling:

```typescript
YourProvider: 'background: #yourcolor; color: white; padding: 2px 6px; border-radius: 3px;',
```

### 4. Register Provider

Add your provider to the registry in `src/scanners/ProviderRegistry.ts`:

```typescript
this.providers.set('your-provider', {
  name: 'your-provider',
  displayName: 'Your Provider Name',
  description: 'Description of your provider capabilities',
  loader: async () => {
    const { YourProvider } = await import('./providers/yourProvider');
    return YourProvider;
  },
});
```

### 5. Test Your Provider

1. Build the application: `npm run build`
2. Start the dev server: `npm run dev`
3. Open the browser and select your provider from the dropdown
4. Test scanning with both camera and image upload

## Provider Interface Contract

### Required Methods

#### `init(): Promise<void>`

- Initialize the barcode scanning library
- Perform any async setup (loading WASM, etc.)
- Throw error if initialization fails

#### `scanVideoFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<string | null>`

- Scan a single frame from video stream
- Use the canvas for any required frame processing
- Return decoded barcode text or null if no barcode found
- Should be optimized for repeated calls (~10 FPS)

#### `scanImage(image: HTMLImageElement | HTMLCanvasElement): Promise<string | null>`

- Scan an uploaded image file
- Return decoded barcode text or null if no barcode found
- Handle both HTMLImageElement and HTMLCanvasElement inputs

### Optional Methods

#### `destroy?(): void`

- Clean up resources when provider is no longer needed
- Stop any background processes
- Release memory

### Properties

#### `name: string`

- Unique identifier for the provider
- Used in logging and UI display

## Performance Considerations

1. **Async Initialization**: All providers should support async initialization for WASM loading
2. **Dynamic Loading**: Providers are loaded on-demand to keep initial bundle size small
3. **Frame Rate**: Video scanning should be optimized for ~10 FPS to avoid blocking UI
4. **Memory Management**: Implement proper cleanup in the `destroy()` method
5. **Error Handling**: Handle scanning failures gracefully and return null rather than throwing

## Benchmarking

The application includes a built-in benchmarking system to compare provider performance:

```javascript
// Access from browser console
await benchmarkRunner.benchmarkImageScan(imageFile);
await benchmarkRunner.benchmarkVideoFrame(video, canvas, 10);
```

Results include:

- Success rate
- Average decode latency
- Error details
- Fastest provider identification

## Browser Compatibility

Different providers have different browser support:

- **ZXing**: Universal support (JavaScript + WebAssembly)
- **BarcodeDetector**: Chrome/Edge only (native API)
- **Quagga2**: Universal support (JavaScript + optional WebAssembly)

The application will automatically show only compatible providers based on browser capabilities.

## Debugging

All providers use the centralized logging system. Enable debug logs in development:

```javascript
// In browser console
logger.clearLogs(); // Start fresh
// Perform scans
logger.exportLogs(); // Get detailed logs
```

Each provider has its own log category with color coding for easy identification in the console.
