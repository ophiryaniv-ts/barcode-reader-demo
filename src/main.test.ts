import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the scanner module
vi.mock('./scanner', () => ({
    BarcodeScanner: vi.fn().mockImplementation(() => ({
        getAvailableProviders: vi.fn().mockReturnValue([
            { name: 'zxing', displayName: 'ZXing', description: 'Test provider' }
        ]),
        getCurrentProvider: vi.fn().mockReturnValue({ name: 'zxing' }),
        setProvider: vi.fn().mockResolvedValue(undefined),
        scanImageFile: vi.fn().mockResolvedValue({
            text: 'test-barcode-result',
            imageData: 'data:image/jpeg;base64,test'
        }),
        on: vi.fn(),
        cleanup: vi.fn()
    }))
}));

// Mock other dependencies
vi.mock('./sw', () => ({
    registerServiceWorker: vi.fn()
}));

vi.mock('./utils', () => ({
    isValidUrl: vi.fn().mockReturnValue(false),
    formatErrorMessage: vi.fn().mockImplementation((error: Error) => error.message)
}));

vi.mock('./logger', () => ({
    logger: {
        info: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        group: vi.fn(),
        groupEnd: vi.fn(),
        time: vi.fn(),
        timeEnd: vi.fn()
    }
}));

vi.mock('./benchmark', () => ({
    benchmarkRunner: {
        benchmarkImageScan: vi.fn(),
        exportReport: vi.fn()
    }
}));

describe('BarcodeApp Main Functionality', () => {
    let mockElements: Record<string, any>;
    let BarcodeApp: any;

    beforeEach(async () => {
        vi.clearAllMocks();

        // Mock DOM elements
        mockElements = {
            openCameraBtn: { addEventListener: vi.fn() },
            uploadBtn: { addEventListener: vi.fn() },
            imageUpload: {
                addEventListener: vi.fn(),
                click: vi.fn(),
                value: '',
                files: null
            },
            dropZone: { addEventListener: vi.fn() },
            stopScanBtn: { addEventListener: vi.fn() },
            scanAgainBtn: { addEventListener: vi.fn() },
            landingPage: { classList: { remove: vi.fn(), add: vi.fn() } },
            scannerPage: { classList: { remove: vi.fn(), add: vi.fn() } },
            resultPage: { classList: { remove: vi.fn(), add: vi.fn() } },
            errorMessage: { classList: { remove: vi.fn(), add: vi.fn() } },
            providerSelect: {
                addEventListener: vi.fn(),
                innerHTML: '',
                appendChild: vi.fn(),
                value: 'zxing'
            },
            providerDescription: { textContent: '' },
            scannerProviderBadge: { textContent: '' },
            resultProviderBadge: { textContent: '' },
            scanTiming: {},
            decodeTiming: {},
            benchmarkBtn: { addEventListener: vi.fn() },
            benchmarkUpload: {
                addEventListener: vi.fn(),
                value: ''
            }
        };

        // Mock document.getElementById
        Object.defineProperty(globalThis, 'document', {
            value: {
                getElementById: vi.fn((id: string) => {
                    const elementKey = id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()).replace(/^./, c => c.toLowerCase());
                    // Return mock element or a basic mock for missing elements
                    return mockElements[elementKey] || {
                        id: id,
                        textContent: '',
                        innerHTML: '',
                        remove: vi.fn(),
                        appendChild: vi.fn(),
                        classList: { add: vi.fn(), remove: vi.fn() }
                    };
                }),
                createElement: vi.fn().mockReturnValue({
                    id: '',
                    className: '',
                    value: '',
                    textContent: '',
                    innerHTML: '',
                    appendChild: vi.fn()
                }),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn()
            },
            configurable: true
        });

        // Mock localStorage
        Object.defineProperty(globalThis, 'localStorage', {
            value: {
                getItem: vi.fn().mockReturnValue(null),
                setItem: vi.fn(),
                removeItem: vi.fn()
            },
            configurable: true
        });

        // Mock setTimeout for processing overlay
        vi.stubGlobal('setTimeout', vi.fn((fn) => fn()));

        // Dynamically import the main module after mocks are set up
        const { BarcodeApp: ImportedBarcodeApp } = await import('./main');
        BarcodeApp = ImportedBarcodeApp;
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('File Input Handling', () => {
        it('should clear file input value after successful image processing', async () => {
            const app = new BarcodeApp();
            expect(app).toBeDefined(); // Ensure app is created

            // Find the file input change event listener
            const imageUploadElement = mockElements.imageUpload;
            const changeListener = imageUploadElement.addEventListener.mock.calls
                .find((call: any) => call[0] === 'change')?.[1];

            expect(changeListener).toBeDefined();

            // Create a mock file and event
            const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
            const mockEvent = {
                target: {
                    files: [mockFile],
                    value: 'test-file-path'
                }
            };

            // Call the change event listener
            await changeListener(mockEvent);

            // Verify that the input value was cleared
            expect(mockEvent.target.value).toBe('');
        });

        it('should not clear file input value if no file is selected', async () => {
            const app = new BarcodeApp();
            expect(app).toBeDefined(); // Ensure app is created

            // Find the file input change event listener
            const imageUploadElement = mockElements.imageUpload;
            const changeListener = imageUploadElement.addEventListener.mock.calls
                .find((call: any) => call[0] === 'change')?.[1];

            expect(changeListener).toBeDefined();

            // Create a mock event with no files
            const mockEvent = {
                target: {
                    files: null,
                    value: 'original-value'
                }
            };

            // Call the change event listener
            await changeListener(mockEvent);

            // Verify that the input value was not changed
            expect(mockEvent.target.value).toBe('original-value');
        });

        it('should allow same file to be uploaded multiple times', async () => {
            const app = new BarcodeApp();
            expect(app).toBeDefined(); // Ensure app is created

            // Find the file input change event listener
            const imageUploadElement = mockElements.imageUpload;
            const changeListener = imageUploadElement.addEventListener.mock.calls
                .find((call: any) => call[0] === 'change')?.[1];

            expect(changeListener).toBeDefined();

            // Create a mock file and event
            const mockFile = new File(['test'], 'test.png', { type: 'image/png' });

            // First upload
            const mockEvent1 = {
                target: {
                    files: [mockFile],
                    value: 'test-file-path'
                }
            };

            await changeListener(mockEvent1);
            expect(mockEvent1.target.value).toBe(''); // Should be cleared

            // Second upload of same file should work
            const mockEvent2 = {
                target: {
                    files: [mockFile],
                    value: 'test-file-path'
                }
            };

            await changeListener(mockEvent2);
            expect(mockEvent2.target.value).toBe(''); // Should be cleared again
        });
    });

    describe('Provider Switching', () => {
        it('should initialize with available providers', async () => {
            const app = new BarcodeApp();
            expect(app).toBeDefined(); // Ensure app is created

            // Check that provider select was populated
            expect(mockElements.providerSelect.appendChild).toHaveBeenCalled();
            expect(mockElements.providerDescription.textContent).toBeTruthy();
        });

        it('should register provider change event listener', async () => {
            const app = new BarcodeApp();
            expect(app).toBeDefined(); // Ensure app is created

            // Find the provider select change event listener
            const providerSelectElement = mockElements.providerSelect;
            const changeListener = providerSelectElement.addEventListener.mock.calls
                .find((call: any) => call[0] === 'change')?.[1];

            // Verify that the change event listener was registered
            expect(changeListener).toBeDefined();
            expect(typeof changeListener).toBe('function');
        });
    });
}); 