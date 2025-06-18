import { BrowserMultiFormatReader } from '@zxing/browser';
import type { IBarcodeProvider } from '../IBarcodeProvider';
import { logger } from '../../logger';

export class ZXingProvider implements IBarcodeProvider {
    public readonly name = 'ZXing';
    private codeReader: BrowserMultiFormatReader | null = null;

    async init(): Promise<void> {
        logger.info('ZXingProvider', 'Initializing ZXing provider');
        try {
            this.codeReader = new BrowserMultiFormatReader();
            logger.debug('ZXingProvider', 'ZXing BrowserMultiFormatReader created');
        } catch (error) {
            logger.error('ZXingProvider', 'Failed to initialize ZXing provider', error as Error);
            throw error;
        }
    }

    async scanVideoFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<string | null> {
        if (!this.codeReader) {
            throw new Error('ZXing provider not initialized');
        }

        if (!video.videoWidth || !video.videoHeight) {
            return null;
        }

        // Draw video frame to canvas for processing
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Cannot get canvas context');
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);

        try {
            // Attempt to decode barcode from canvas
            const result = await this.codeReader.decodeFromCanvas(canvas);
            return result.getText();
        } catch (error) {
            // No barcode found in this frame
            return null;
        }
    }

    async scanImage(image: HTMLImageElement | HTMLCanvasElement): Promise<string | null> {
        if (!this.codeReader) {
            throw new Error('ZXing provider not initialized');
        }

        try {
            let result;
            if (image instanceof HTMLCanvasElement) {
                result = await this.codeReader.decodeFromCanvas(image);
            } else {
                // For HTMLImageElement, we need to draw it to a canvas first
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                if (!context) {
                    throw new Error('Cannot get canvas context');
                }

                canvas.width = image.width;
                canvas.height = image.height;
                context.drawImage(image, 0, 0);

                result = await this.codeReader.decodeFromCanvas(canvas);
            }

            return result.getText();
        } catch (error) {
            logger.debug('ZXingProvider', 'No barcode found', error);
            return null;
        }
    }

    destroy(): void {
        logger.debug('ZXingProvider', 'Destroying ZXing provider');
        // ZXing doesn't require explicit cleanup, but we'll reset the reader
        this.codeReader = null;
    }
} 