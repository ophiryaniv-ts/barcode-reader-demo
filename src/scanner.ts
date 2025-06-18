import { BrowserMultiFormatReader } from '@zxing/browser';
import { logger } from './logger';

export interface ScanResult {
    text: string;
    imageData: string;
}

export type ScannerEventType = 'success' | 'error';

export class BarcodeScanner {
    private codeReader: BrowserMultiFormatReader;
    private videoElement: HTMLVideoElement;
    private canvasElement: HTMLCanvasElement;
    private isScanning: boolean = false;
    private stream: MediaStream | null = null;
    private eventListeners: Map<ScannerEventType, ((data: any) => void)[]> = new Map();

    constructor() {
        logger.info('Scanner', 'Initializing BarcodeScanner');
        logger.group('Scanner', 'Constructor');

        try {
            this.codeReader = new BrowserMultiFormatReader();
            logger.debug('Scanner', 'ZXing BrowserMultiFormatReader created');

            this.videoElement = document.getElementById('camera-preview') as HTMLVideoElement;
            this.canvasElement = document.getElementById('capture-canvas') as HTMLCanvasElement;

            if (!this.videoElement || !this.canvasElement) {
                const error = new Error('Required video or canvas elements not found');
                logger.error('Scanner', 'DOM elements not found', error);
                throw error;
            }

            logger.debug('Scanner', 'DOM elements found successfully');
            this.initializeEventListeners();
            logger.info('Scanner', 'BarcodeScanner initialized successfully');
        } catch (error) {
            logger.error('Scanner', 'Failed to initialize BarcodeScanner', error as Error);
            throw error;
        } finally {
            logger.groupEnd();
        }
    }

    private initializeEventListeners(): void {
        this.eventListeners.set('success', []);
        this.eventListeners.set('error', []);
    }

    public on(event: ScannerEventType, callback: (data: any) => void): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.push(callback);
        }
    }

    private emit(event: ScannerEventType, data: any): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => callback(data));
        }
    }

    public async start(): Promise<void> {
        logger.info('Scanner', 'Starting camera scanner');

        if (this.isScanning) {
            logger.warn('Scanner', 'Scanner already running, ignoring start request');
            return;
        }

        logger.time('Camera Initialization');

        try {
            // Request camera access
            const constraints: MediaStreamConstraints = {
                video: {
                    facingMode: 'environment', // Prefer rear camera
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                }
            };

            logger.debug('Scanner', 'Requesting camera access', { constraints });
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            logger.debug('Scanner', 'Camera stream obtained');

            this.videoElement.srcObject = this.stream;

            await new Promise<void>((resolve, reject) => {
                this.videoElement.onloadedmetadata = () => {
                    logger.debug('Scanner', 'Video metadata loaded', {
                        width: this.videoElement.videoWidth,
                        height: this.videoElement.videoHeight
                    });

                    this.videoElement.play()
                        .then(() => {
                            logger.debug('Scanner', 'Video playback started');
                            resolve();
                        })
                        .catch(reject);
                };
                this.videoElement.onerror = reject;
            });

            this.isScanning = true;
            logger.timeEnd('Camera Initialization');
            logger.info('Scanner', 'Camera scanner started successfully');
            this.startScanningLoop();
        } catch (error) {
            logger.timeEnd('Camera Initialization');
            logger.error('Scanner', 'Failed to start camera scanner', error as Error);
            this.emit('error', error);
            throw error;
        }
    }

    public stop(): void {
        this.isScanning = false;

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        this.videoElement.srcObject = null;
    }

    private async startScanningLoop(): Promise<void> {
        if (!this.isScanning) {
            return;
        }

        try {
            const result = await this.scanFrame();
            if (result) {
                const imageData = this.captureFrame();
                this.emit('success', { text: result.getText(), imageData });
                return;
            }
        } catch (error) {
            // Ignore individual frame scan errors, continue scanning
            console.debug('Frame scan error:', error);
        }

        // Continue scanning at ~10 fps
        setTimeout(() => this.startScanningLoop(), 100);
    }

    private async scanFrame(): Promise<any | null> {
        if (!this.videoElement.videoWidth || !this.videoElement.videoHeight) {
            return null;
        }

        // Draw video frame to canvas for processing
        const context = this.canvasElement.getContext('2d');
        if (!context) {
            throw new Error('Cannot get canvas context');
        }

        this.canvasElement.width = this.videoElement.videoWidth;
        this.canvasElement.height = this.videoElement.videoHeight;

        context.drawImage(this.videoElement, 0, 0);

        try {
            // Attempt to decode barcode from canvas
            return await this.codeReader.decodeFromCanvas(this.canvasElement);
        } catch (error) {
            // No barcode found in this frame
            return null;
        }
    }

    private captureFrame(): string {
        const context = this.canvasElement.getContext('2d');
        if (!context) {
            throw new Error('Cannot get canvas context');
        }

        // Set canvas to a reasonable size for display
        const displayWidth = Math.min(400, this.videoElement.videoWidth);
        const displayHeight = (displayWidth / this.videoElement.videoWidth) * this.videoElement.videoHeight;

        this.canvasElement.width = displayWidth;
        this.canvasElement.height = displayHeight;

        context.drawImage(this.videoElement, 0, 0, displayWidth, displayHeight);

        return this.canvasElement.toDataURL('image/jpeg', 0.8);
    }

    public async getSupportedDevices(): Promise<MediaDeviceInfo[]> {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(device => device.kind === 'videoinput');
        } catch (error) {
            console.error('Error getting media devices:', error);
            return [];
        }
    }

    public async scanImageFile(file: File): Promise<ScanResult> {
        logger.info('Scanner', 'Scanning uploaded image file', {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
        });
        logger.time('Image File Scan');

        return new Promise((resolve, reject) => {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                logger.warn('Scanner', 'Invalid file type rejected', { fileType: file.type });
                reject(new Error('Please select a valid image file.'));
                return;
            }

            logger.debug('Scanner', 'File type validation passed');

            const img = new Image();
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            if (!context) {
                reject(new Error('Cannot get canvas context'));
                return;
            }

            img.onload = async () => {
                logger.debug('Scanner', 'Image loaded successfully', {
                    width: img.width,
                    height: img.height
                });

                try {
                    // Set canvas size to image size
                    canvas.width = img.width;
                    canvas.height = img.height;

                    // Draw image to canvas
                    context.drawImage(img, 0, 0);
                    logger.debug('Scanner', 'Image drawn to canvas');

                    // Attempt to decode barcode
                    logger.debug('Scanner', 'Attempting barcode decode...');
                    const result = await this.codeReader.decodeFromCanvas(canvas);
                    logger.info('Scanner', 'Barcode decoded successfully', { text: result.getText() });

                    // Create thumbnail for display
                    const thumbnailCanvas = document.createElement('canvas');
                    const thumbnailContext = thumbnailCanvas.getContext('2d');

                    if (thumbnailContext) {
                        const maxSize = 400;
                        const scale = Math.min(maxSize / img.width, maxSize / img.height);
                        thumbnailCanvas.width = img.width * scale;
                        thumbnailCanvas.height = img.height * scale;

                        thumbnailContext.drawImage(img, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height);

                        logger.timeEnd('Image File Scan');
                        logger.info('Scanner', 'Image file scan completed successfully');

                        resolve({
                            text: result.getText(),
                            imageData: thumbnailCanvas.toDataURL('image/jpeg', 0.8)
                        });
                    } else {
                        logger.timeEnd('Image File Scan');
                        logger.error('Scanner', 'Cannot create thumbnail canvas');
                        reject(new Error('Cannot create thumbnail'));
                    }
                } catch (error) {
                    logger.timeEnd('Image File Scan');
                    logger.warn('Scanner', 'No barcode found in uploaded image', error as Error);
                    reject(new Error('No barcode found in the image. Please try another image.'));
                }
            };

            img.onerror = () => {
                logger.timeEnd('Image File Scan');
                logger.error('Scanner', 'Failed to load image file');
                reject(new Error('Failed to load image. Please try another file.'));
            };

            // Load the image
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    img.src = e.target.result as string;
                }
            };
            reader.onerror = () => {
                reject(new Error('Failed to read file.'));
            };
            reader.readAsDataURL(file);
        });
    }

    public isSupported(): boolean {
        return !!(
            navigator.mediaDevices &&
            typeof navigator.mediaDevices.getUserMedia === 'function' &&
            window.HTMLVideoElement &&
            window.HTMLCanvasElement
        );
    }
} 