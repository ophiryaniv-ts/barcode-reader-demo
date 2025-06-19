import type { IBarcodeProvider } from '../IBarcodeProvider';
import { logger } from '../../logger';
import { readBarcodes, type ReaderOptions } from "zxing-wasm/reader";

/**
 * ZXing WASM Provider
 *
 * Uses the WASM build of ZXing for potentially faster performance compared to the JS build.
 * Library: https://github.com/Sec-ant/zxing-wasm
 */
const readerOptions: ReaderOptions = {
    tryHarder: true,
    formats: ["QRCode", "PDF417"],
    maxNumberOfSymbols: 1,
};

export class ZXingWasmProvider implements IBarcodeProvider {
    public readonly name = 'ZXing-WASM';

    // WASM decoder instance
    private readFn: ((img: ImageData, opts?: any) => Promise<any>) | null = null;

    async init(): Promise<void> {
        logger.info('ZXingWasmProvider', 'Initializing ZXing-WASM provider');

        try {
            // const zxing = await import('@sec-ant/zxing-wasm');
            // await zxing.getZXingModule(); // ensure WASM ready
            this.readFn = readBarcodes;
            logger.debug('ZXingWasmProvider', 'WASM module loaded');
        } catch (error) {
            logger.error('ZXingWasmProvider', 'Failed to load zxing-wasm', error as Error);
            throw error;
        }
    }

    async scanVideoFrame(video: HTMLVideoElement): Promise<string | null> {
        if (!this.readFn) throw new Error('ZXing-WASM not initialised');

        const imageData = await createImageBitmap(video).then((imageBitmap) => {
            const { width, height } = imageBitmap;
            const context = new OffscreenCanvas(width, height).getContext(
                "2d",
            ) as OffscreenCanvasRenderingContext2D;
            context.drawImage(imageBitmap, 0, 0, width, height);
            return context.getImageData(0, 0, width, height);
        });

        try {
            const res = await this.readFn!(imageData, readerOptions);
            return res ? res[0].text : null;
        } catch {
            return null;
        }
    }

    async scanImage(image: HTMLImageElement | HTMLCanvasElement): Promise<string | null> {
        if (!this.readFn) throw new Error('ZXing-WASM not initialised');

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
        const ctx = canvas.getContext('2d')!;
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);

        try {
            const res = await this.readFn!(data, readerOptions);
            return res[0]?.text || null;
        } catch {
            return null;
        }
    }

    destroy(): void {
        logger.debug('ZXingWasmProvider', 'Destroying decoder');
        this.readFn = null;
    }
} 