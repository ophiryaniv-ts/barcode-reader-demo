# Barcode Scanner Demo

A progressive web app for scanning QR codes and PDF417 barcodes with **multiple scanning engine support** for performance comparison.

## 🚀 Features

- **📱 Camera Scanning**: Real-time barcode detection using device camera
- **📁 Image Upload**: Scan barcodes from uploaded images with drag & drop support
- **🔧 Multiple Engines**: Compare different barcode scanning libraries
- **⚡ Performance Benchmarking**: Built-in tools to measure scanning speed and accuracy
- **📊 Provider Switching**: Seamlessly switch between different scanning engines
- **🌐 PWA Ready**: Works offline and can be installed on mobile devices
- **📝 Comprehensive Logging**: Detailed performance and debugging information

## 🎯 Supported Barcode Formats

- QR Codes
- PDF417
- Code 128, Code 39 (engine dependent)
- EAN-13, EAN-8 (engine dependent)

## 🔧 Available Scanning Engines

### ZXing

- **Status**: ✅ Fully implemented
- **Support**: Universal (JavaScript + WebAssembly)
- **Bundle Size**: ~413KB
- **Performance**: Fast and reliable
- **Formats**: QR codes, PDF417, and more

### BarcodeDetector (Native)

- **Status**: ✅ Fully implemented
- **Support**: Chrome/Edge only (native browser API)
- **Bundle Size**: ~1.7KB
- **Performance**: Fastest (hardware accelerated)
- **Formats**: QR codes, PDF417, Code 128, Code 39, EAN-13, EAN-8

### Quagga2

- **Status**: 🚧 Skeleton implementation (ready for development)
- **Support**: Universal (JavaScript + optional WebAssembly)
- **Bundle Size**: TBD
- **Performance**: TBD

## 🛠️ Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Preview production build
npm run preview
```

## 📱 Usage

1. **Select Scanner Engine**: Choose your preferred scanning engine from the dropdown
2. **Camera Scanning**: Click "Open Camera" to start real-time barcode detection
3. **Image Upload**: Click "Upload Image" or drag & drop an image file
4. **View Results**: Decoded text is displayed with automatic URL detection

## 🏁 Performance Benchmarking

Access the built-in benchmarking tools via browser console:

```javascript
// Benchmark image scanning across all providers
await benchmarkRunner.benchmarkImageScan(imageFile);

// Benchmark video frame scanning
await benchmarkRunner.benchmarkVideoFrame(video, canvas, 10);

// Export results as markdown
console.log(benchmarkRunner.exportReport(report));
```

## 🔍 Engine Comparison

| Engine          | Bundle Size | Browser Support | Performance | Hardware Acceleration |
| --------------- | ----------- | --------------- | ----------- | --------------------- |
| ZXing           | 413KB       | Universal       | ⭐⭐⭐⭐    | No                    |
| BarcodeDetector | 1.7KB       | Chrome/Edge     | ⭐⭐⭐⭐⭐  | Yes                   |
| Quagga2         | TBD         | Universal       | TBD         | Optional              |

## 🏗️ Architecture

The application uses a **pluggable provider system** that allows:

- **Dynamic Loading**: Providers are loaded on-demand to minimize initial bundle size
- **Hot Swapping**: Switch between engines without restarting the application
- **Unified Interface**: All providers implement the same `IBarcodeProvider` interface
- **Performance Monitoring**: Built-in timing and success rate tracking

See [Provider Documentation](docs/providers.md) for detailed information on adding new scanning engines.

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run tests with coverage
npm test:coverage

# Run end-to-end tests
npm test:e2e
```

## 📱 PWA Features

- **Offline Support**: Service worker caches static assets
- **Installation**: Can be installed on mobile devices and desktop
- **Fast Loading**: Optimized for performance on slower networks

## 🎨 Technologies

- **Frontend**: TypeScript, Vite, Progressive Web App
- **Scanning**: ZXing, BarcodeDetector API
- **Testing**: Vitest, Playwright
- **Bundling**: Vite with dynamic imports for code splitting

## 📖 API Documentation

### Scanner Interface

```typescript
interface IBarcodeProvider {
  name: string;
  init(): Promise<void>;
  scanVideoFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<string | null>;
  scanImage(image: HTMLImageElement | HTMLCanvasElement): Promise<string | null>;
  destroy?(): void;
}
```

### Provider Registry

```typescript
// Get available providers
const providers = registry.getAvailableProviders();

// Load specific provider
const provider = await registry.loadProvider('zxing');

// Switch current provider
await registry.setCurrentProvider('barcode-detector');
```

## 🤝 Contributing

1. **Adding New Providers**: See [Provider Documentation](docs/providers.md)
2. **Bug Reports**: Open an issue with reproduction steps
3. **Feature Requests**: Describe the use case and expected behavior

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Related Projects

- [ZXing](https://github.com/zxing-js/library) - Multi-format 1D/2D barcode image processing library
- [BarcodeDetector API](https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector) - Native browser barcode detection
- [Quagga2](https://github.com/ericblade/quagga2) - Advanced barcode-scanner written in JavaScript
