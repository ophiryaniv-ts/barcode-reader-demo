import type { IBarcodeProvider } from '../IBarcodeProvider';
import { logger } from '../../logger';

import { CoreModule } from "dynamsoft-barcode-reader-bundle";
import { LicenseManager } from "dynamsoft-barcode-reader-bundle";
import { CaptureVisionRouter } from "dynamsoft-barcode-reader-bundle";

/**
 * Dynamsoft Barcode Reader Provider (commercial SDK)
 * Requires a Dynamsoft license key. Runtime key can be set via `DynamsoftLicense.LicenseKey = '...';`
 * Library: https://github.com/Dynamsoft/barcode-reader-javascript-samples
 */
export class DynamsoftProvider implements IBarcodeProvider {
    public readonly name = 'Dynamsoft';

    private reader: any | null = null;

    async init(): Promise<void> {
        CoreModule.engineResourcePaths.rootDirectory = "https://cdn.jsdelivr.net/npm/";

        logger.info('DynamsoftProvider', 'Initializing Dynamsoft provider');

        try {
            LicenseManager.initLicense("DLS2eyJoYW5kc2hha2VDb2RlIjoiMTAxNTM1MTE5LVRYbFhaV0pRY205cSIsIm1haW5TZXJ2ZXJVUkwiOiJodHRwczovL21kbHMuZHluYW1zb2Z0b25saW5lLmNvbSIsIm9yZ2FuaXphdGlvbklEIjoiMTAxNTM1MTE5Iiwic3RhbmRieVNlcnZlclVSTCI6Imh0dHBzOi8vc2Rscy5keW5hbXNvZnRvbmxpbmUuY29tIiwiY2hlY2tDb2RlIjoyMDc0NjM0MzZ9", { executeNow: true });
            CoreModule.loadWasm(["DBR"]);
            this.reader = await CaptureVisionRouter.createInstance();
            logger.debug('DynamsoftProvider', 'Dynamsoft SDK loaded');
        } catch (error) {
            logger.error('DynamsoftProvider', 'Failed to load Dynamsoft SDK', error as Error);
            throw error;
        }
    }

    private async decodeCanvas(canvas: HTMLImageElement | HTMLCanvasElement): Promise<string | null> {
        if (!this.reader) throw new Error('Dynamsoft provider not initialised');
        const results = await this.reader.capture(canvas);
        // find only pdf417 and qr code
        const pdf417Result = results.barcodeResultItems.find((item: any) => item.formatString === "PDF417");
        const qrResult = results.barcodeResultItems.find((item: any) => item.formatString === "QRCode");
        return pdf417Result ? pdf417Result.text : qrResult ? qrResult.text : null;
    }

    async scanVideoFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<string | null> {
        if (!this.reader) throw new Error('Dynamsoft provider not initialised');
        if (!video.videoWidth) return null;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Cannot get canvas context');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        return this.decodeCanvas(canvas);
    }

    async scanImage(image: HTMLImageElement | HTMLCanvasElement): Promise<string | null> {
        let canvas: HTMLCanvasElement;
        if (image instanceof HTMLCanvasElement) {
            canvas = image;
        } else {
            canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth || image.width;
            canvas.height = image.naturalHeight || image.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Cannot get canvas context');
            ctx.drawImage(image, 0, 0);
        }
        return this.decodeCanvas(image);
    }

    destroy(): void {
        logger.debug('DynamsoftProvider', 'Releasing Dynamsoft resources');
        this.reader?.destroy?.();
        this.reader = null;
    }
} 