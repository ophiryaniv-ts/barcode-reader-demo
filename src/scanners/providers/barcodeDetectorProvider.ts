import type { IBarcodeProvider } from '../IBarcodeProvider';
import { logger } from '../../logger';

// Extend global interface for BarcodeDetector
declare global {
    interface Window {
        BarcodeDetector?: new (options?: { formats: string[] }) => BarcodeDetector;
    }

    interface BarcodeDetector {
        detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
    }

    interface DetectedBarcode {
        rawValue: string;
        format: string;
    }
}

export class BarcodeDetectorProvider implements IBarcodeProvider {
    public readonly name = 'BarcodeDetector';
    private detector: BarcodeDetector | null = null;

    async init(): Promise<void> {
        logger.info('BarcodeDetectorProvider', 'Initializing BarcodeDetector provider');

        // Check if BarcodeDetector is supported
        if (!('BarcodeDetector' in window)) {
            throw new Error('BarcodeDetector API not supported in this browser');
        }

        try {
            // TODO: Specify desired formats based on requirements
            this.detector = new window.BarcodeDetector!({
                formats: ['qr_code', 'pdf417', 'code_128', 'code_39', 'ean_13', 'ean_8']
            });
            logger.debug('BarcodeDetectorProvider', 'Native BarcodeDetector created');
        } catch (error) {
            logger.error('BarcodeDetectorProvider', 'Failed to initialize BarcodeDetector', error as Error);
            throw error;
        }
    }

    async scanVideoFrame(video: HTMLVideoElement): Promise<string | null> {
        if (!this.detector) {
            throw new Error('BarcodeDetector provider not initialized');
        }

        if (!video.videoWidth || !video.videoHeight) {
            return null;
        }

        try {
            // BarcodeDetector can work directly with video element
            const barcodes = await this.detector.detect(video);

            if (barcodes.length > 0) {
                logger.debug('BarcodeDetectorProvider', `Found ${barcodes.length} barcode(s)`, {
                    formats: barcodes.map(b => b.format)
                });
                return barcodes[0].rawValue;
            }

            return null;
        } catch (error) {
            logger.debug('BarcodeDetectorProvider', 'No barcode found in video frame', error);
            return null;
        }
    }

    async scanImage(image: HTMLImageElement | HTMLCanvasElement): Promise<string | null> {
        if (!this.detector) {
            throw new Error('BarcodeDetector provider not initialized');
        }

        try {
            const barcodes = await this.detector.detect(image);

            if (barcodes.length > 0) {
                logger.debug('BarcodeDetectorProvider', `Found ${barcodes.length} barcode(s)`, {
                    formats: barcodes.map(b => b.format)
                });
                logger.debug('BarcodeDetectorProvider', `Barcode: ${barcodes[0].rawValue}`);
                return barcodes[0].rawValue;
            }

            return null;
        } catch (error) {
            logger.debug('BarcodeDetectorProvider', 'No barcode found in image', error);
            return null;
        }
    }

    destroy?(): void {
        logger.debug('BarcodeDetectorProvider', 'Destroying BarcodeDetector provider');
        // Native BarcodeDetector doesn't require explicit cleanup
        this.detector = null;
    }
} 