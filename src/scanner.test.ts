import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BarcodeScanner } from './scanner';

// Mock the ZXing library
vi.mock('@zxing/browser', () => ({
    BrowserMultiFormatReader: vi.fn().mockImplementation(() => ({
        decodeFromCanvas: vi.fn(),
    })),
}));

// Mock DOM elements
const mockVideoElement = {
    srcObject: null,
    play: vi.fn().mockResolvedValue(undefined),
    videoWidth: 640,
    videoHeight: 480,
    onloadedmetadata: null,
    onerror: null,
} as any;

const mockCanvasElement = {
    width: 0,
    height: 0,
    getContext: vi.fn().mockReturnValue({
        drawImage: vi.fn(),
    }),
    toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,fake-image-data'),
} as any;

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn();
const mockEnumerateDevices = vi.fn();

Object.defineProperty(globalThis, 'navigator', {
    value: {
        mediaDevices: {
            getUserMedia: mockGetUserMedia,
            enumerateDevices: mockEnumerateDevices,
        },
    },
    configurable: true,
});

// Mock DOM methods
Object.defineProperty(globalThis, 'document', {
    value: {
        getElementById: vi.fn((id: string) => {
            if (id === 'camera-preview') return mockVideoElement;
            if (id === 'capture-canvas') return mockCanvasElement;
            return null;
        }),
    },
    configurable: true,
});

describe('BarcodeScanner', () => {
    let scanner: BarcodeScanner;
    let mockStream: any;

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // Reset video element mock
        mockVideoElement.srcObject = null;
        mockVideoElement.onloadedmetadata = null;
        mockVideoElement.onerror = null;

        // Create mock stream
        mockStream = {
            getTracks: vi.fn().mockReturnValue([
                { stop: vi.fn() },
                { stop: vi.fn() },
            ]),
        };

        mockGetUserMedia.mockResolvedValue(mockStream);
        mockEnumerateDevices.mockResolvedValue([
            { deviceId: 'camera1', kind: 'videoinput', label: 'Front Camera' },
            { deviceId: 'camera2', kind: 'videoinput', label: 'Back Camera' },
        ]);

        // Ensure navigator is properly mocked for each test
        Object.defineProperty(globalThis, 'navigator', {
            value: {
                mediaDevices: {
                    getUserMedia: mockGetUserMedia,
                    enumerateDevices: mockEnumerateDevices,
                },
            },
            configurable: true,
        });

        scanner = new BarcodeScanner();
    });

    afterEach(() => {
        if (scanner) {
            scanner.stop();
        }
    });

    describe('constructor', () => {
        it('should initialize with required DOM elements', () => {
            expect(document.getElementById).toHaveBeenCalledWith('camera-preview');
            expect(document.getElementById).toHaveBeenCalledWith('capture-canvas');
        });

        it('should throw error if video element is missing', () => {
            const originalGetElementById = document.getElementById;
            (document.getElementById as any) = vi.fn((id: string) => {
                if (id === 'camera-preview') return null;
                if (id === 'capture-canvas') return mockCanvasElement;
                return null;
            });

            expect(() => new BarcodeScanner()).toThrow('Required video or canvas elements not found');

            (document.getElementById as any) = originalGetElementById;
        });
    });

    describe('event handling', () => {
        it('should register event listeners', () => {
            const successCallback = vi.fn();
            const errorCallback = vi.fn();

            scanner.on('success', successCallback);
            scanner.on('error', errorCallback);

            // Emit events directly for testing
            (scanner as any).emit('success', { text: 'test', imageData: 'data' });
            (scanner as any).emit('error', new Error('test error'));

            expect(successCallback).toHaveBeenCalledWith({ text: 'test', imageData: 'data' });
            expect(errorCallback).toHaveBeenCalledWith(new Error('test error'));
        });
    });

    describe('start', () => {
        it('should request camera access and start scanning', async () => {
            // Start the scanner
            const startPromise = scanner.start();

            // Trigger the onloadedmetadata callback
            if (mockVideoElement.onloadedmetadata) {
                mockVideoElement.onloadedmetadata();
            }

            await startPromise;

            expect(mockGetUserMedia).toHaveBeenCalledWith({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
            });

            expect(mockVideoElement.srcObject).toBe(mockStream);
        });

        it('should not start if already scanning', async () => {
            // Start the scanner first time
            const firstStartPromise = scanner.start();
            if (mockVideoElement.onloadedmetadata) {
                mockVideoElement.onloadedmetadata();
            }
            await firstStartPromise;

            const callCount = mockGetUserMedia.mock.calls.length;

            // Try to start again
            await scanner.start();

            expect(mockGetUserMedia).toHaveBeenCalledTimes(callCount);
        });

        it('should emit error on getUserMedia failure', async () => {
            const error = new Error('Camera access denied');
            mockGetUserMedia.mockRejectedValue(error);

            const errorCallback = vi.fn();
            scanner.on('error', errorCallback);

            await expect(scanner.start()).rejects.toThrow('Camera access denied');
            expect(errorCallback).toHaveBeenCalledWith(error);
        });
    });

    describe('stop', () => {
        it('should stop media tracks and clear video source', async () => {
            // Start the scanner
            const startPromise = scanner.start();
            if (mockVideoElement.onloadedmetadata) {
                mockVideoElement.onloadedmetadata();
            }
            await startPromise;

            scanner.stop();

            expect(mockStream.getTracks()[0].stop).toHaveBeenCalled();
            expect(mockStream.getTracks()[1].stop).toHaveBeenCalled();
            expect(mockVideoElement.srcObject).toBeNull();
        });

        it('should be safe to call when not scanning', () => {
            expect(() => scanner.stop()).not.toThrow();
        });
    });

    describe('getSupportedDevices', () => {
        it('should return video input devices', async () => {
            const devices = await scanner.getSupportedDevices();

            expect(mockEnumerateDevices).toHaveBeenCalled();
            expect(devices).toHaveLength(2);
            expect(devices[0].kind).toBe('videoinput');
            expect(devices[1].kind).toBe('videoinput');
        });

        it('should handle enumerate devices error', async () => {
            mockEnumerateDevices.mockRejectedValue(new Error('Permission denied'));

            const devices = await scanner.getSupportedDevices();

            expect(devices).toEqual([]);
        });
    });

    describe('isSupported', () => {
        it('should return true when all APIs are supported', () => {
            expect(scanner.isSupported()).toBe(true);
        });

        it('should return false when getUserMedia is not supported', () => {
            Object.defineProperty(globalThis, 'navigator', {
                value: {
                    mediaDevices: {},
                },
                configurable: true,
            });

            const newScanner = new BarcodeScanner();
            expect(newScanner.isSupported()).toBe(false);
        });
    });

    describe('frame processing', () => {
        it('should capture frame and return image data', async () => {
            // Start the scanner
            const startPromise = scanner.start();
            if (mockVideoElement.onloadedmetadata) {
                mockVideoElement.onloadedmetadata();
            }
            await startPromise;

            // Simulate video dimensions
            mockVideoElement.videoWidth = 800;
            mockVideoElement.videoHeight = 600;

            const imageData = (scanner as any).captureFrame();

            expect(mockCanvasElement.getContext).toHaveBeenCalledWith('2d');
            expect(mockCanvasElement.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.8);
            expect(imageData).toBe('data:image/jpeg;base64,fake-image-data');
        });
    });
}); 