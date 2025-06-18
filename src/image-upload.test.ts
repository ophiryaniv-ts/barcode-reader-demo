import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BarcodeScanner } from './scanner';

// Mock the ZXing library
vi.mock('@zxing/browser', () => ({
    BrowserMultiFormatReader: vi.fn().mockImplementation(() => ({
        decodeFromCanvas: vi.fn(),
    })),
}));

describe('Image Upload Functionality', () => {
    let scanner: BarcodeScanner;
    let mockCodeReader: any;

    beforeEach(async () => {
        vi.clearAllMocks();

        // Mock DOM
        Object.defineProperty(globalThis, 'document', {
            value: {
                getElementById: vi.fn(() => ({
                    width: 0,
                    height: 0,
                    getContext: vi.fn().mockReturnValue({
                        drawImage: vi.fn(),
                    }),
                })),
                createElement: vi.fn(() => ({
                    width: 0,
                    height: 0,
                    getContext: vi.fn().mockReturnValue({
                        drawImage: vi.fn(),
                    }),
                    toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,thumbnail'),
                })),
            },
            configurable: true,
        });

        // Mock Image
        Object.defineProperty(globalThis, 'Image', {
            value: class MockImage {
                onload: (() => void) | null = null;
                onerror: (() => void) | null = null;
                width = 800;
                height = 600;
                src = '';

                constructor() {
                    setTimeout(() => {
                        if (this.onload) this.onload();
                    }, 0);
                }
            },
            configurable: true,
        });

        // Mock FileReader
        Object.defineProperty(globalThis, 'FileReader', {
            value: class MockFileReader {
                onload: ((event: any) => void) | null = null;
                onerror: (() => void) | null = null;
                result: string | null = null;

                readAsDataURL(file: File) {
                    setTimeout(() => {
                        this.result = `data:${file.type};base64,fake-data`;
                        if (this.onload) {
                            this.onload({ target: { result: this.result } });
                        }
                    }, 0);
                }
            },
            configurable: true,
        });

        mockCodeReader = {
            decodeFromCanvas: vi.fn().mockResolvedValue({
                getText: () => 'https://example.com/test',
            }),
        };

        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        vi.mocked(BrowserMultiFormatReader).mockImplementation(() => mockCodeReader);

        scanner = new BarcodeScanner();
    });

    it('should scan image file successfully', async () => {
        const file = new File(['data'], 'test.png', { type: 'image/png' });

        const result = await scanner.scanImageFile(file);

        expect(result.text).toBe('https://example.com/test');
        expect(mockCodeReader.decodeFromCanvas).toHaveBeenCalled();
    });

    it('should reject non-image files', async () => {
        const file = new File(['data'], 'test.txt', { type: 'text/plain' });

        await expect(scanner.scanImageFile(file)).rejects.toThrow(
            'Please select a valid image file.'
        );
    });
});
