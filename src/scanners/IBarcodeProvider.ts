export interface IBarcodeProvider {
    name: string; // e.g. "ZXing", "Quagga2"
    init(): Promise<void>; // Any async WASM setup
    scanVideoFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<string | null>;
    scanImage(image: HTMLImageElement | HTMLCanvasElement): Promise<string | null>;
    destroy?(): void; // Cleanup if needed
}

export interface ScanResult {
    text: string;
    imageData: string;
}

export type ScannerEventType = 'success' | 'error'; 