import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    isValidUrl,
    throttle,
    formatErrorMessage,
    checkBrowserSupport,
    debounce
} from './utils';

describe('isValidUrl', () => {
    it('should return true for valid HTTP URLs', () => {
        expect(isValidUrl('http://example.com')).toBe(true);
        expect(isValidUrl('https://example.com')).toBe(true);
        expect(isValidUrl('https://www.example.com/path?query=value')).toBe(true);
    });

    it('should return true for valid non-HTTP URLs', () => {
        expect(isValidUrl('ftp://files.example.com')).toBe(true);
        expect(isValidUrl('mailto:test@example.com')).toBe(true);
        expect(isValidUrl('file:///path/to/file')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
        expect(isValidUrl('not-a-url')).toBe(false);
        expect(isValidUrl('example.com')).toBe(false);
        expect(isValidUrl('')).toBe(false);
        expect(isValidUrl('http://')).toBe(false);
    });
});

describe('throttle', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should call function immediately on first call', () => {
        const mockFn = vi.fn();
        const throttledFn = throttle(mockFn, 100);

        throttledFn('arg1');
        expect(mockFn).toHaveBeenCalledWith('arg1');
        expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should throttle subsequent calls within delay period', () => {
        const mockFn = vi.fn();
        const throttledFn = throttle(mockFn, 100);

        throttledFn('arg1');
        throttledFn('arg2');
        throttledFn('arg3');

        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(mockFn).toHaveBeenCalledWith('arg1');
    });

    it('should allow calls after delay period', () => {
        const mockFn = vi.fn();
        const throttledFn = throttle(mockFn, 100);

        throttledFn('arg1');
        vi.advanceTimersByTime(100);
        throttledFn('arg2');

        expect(mockFn).toHaveBeenCalledTimes(2);
        expect(mockFn).toHaveBeenNthCalledWith(1, 'arg1');
        expect(mockFn).toHaveBeenNthCalledWith(2, 'arg2');
    });
});

describe('debounce', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should delay function execution', () => {
        const mockFn = vi.fn();
        const debouncedFn = debounce(mockFn, 100);

        debouncedFn('arg1');
        expect(mockFn).not.toHaveBeenCalled();

        vi.advanceTimersByTime(100);
        expect(mockFn).toHaveBeenCalledWith('arg1');
    });

    it('should cancel previous calls when called multiple times', () => {
        const mockFn = vi.fn();
        const debouncedFn = debounce(mockFn, 100);

        debouncedFn('arg1');
        debouncedFn('arg2');
        debouncedFn('arg3');

        vi.advanceTimersByTime(100);
        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(mockFn).toHaveBeenCalledWith('arg3');
    });
});

describe('formatErrorMessage', () => {
    it('should format NotAllowedError correctly', () => {
        const error = new Error('Permission denied');
        error.name = 'NotAllowedError';

        expect(formatErrorMessage(error)).toBe(
            'Camera permission denied. Please allow camera access and try again.'
        );
    });

    it('should format NotFoundError correctly', () => {
        const error = new Error('No camera found');
        error.name = 'NotFoundError';

        expect(formatErrorMessage(error)).toBe('No camera found on this device.');
    });

    it('should format NotSupportedError correctly', () => {
        const error = new Error('Not supported');
        error.name = 'NotSupportedError';

        expect(formatErrorMessage(error)).toBe('Camera not supported in this browser.');
    });

    it('should format OverconstrainedError correctly', () => {
        const error = new Error('Constraints not satisfied');
        error.name = 'OverconstrainedError';

        expect(formatErrorMessage(error)).toBe(
            'Camera constraints not supported. Trying with default settings.'
        );
    });

    it('should format generic errors correctly', () => {
        const error = new Error('Some generic error');

        expect(formatErrorMessage(error)).toBe('Error: Some generic error');
    });
});

describe('checkBrowserSupport', () => {
    const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

    afterEach(() => {
        // Restore original descriptors
        if (originalNavigator) {
            Object.defineProperty(globalThis, 'navigator', originalNavigator);
        }
        if (originalWindow) {
            Object.defineProperty(globalThis, 'window', originalWindow);
        }
    });

    it('should return supported when all features are available', () => {
        // Mock all required APIs
        Object.defineProperty(globalThis, 'navigator', {
            value: {
                mediaDevices: {
                    getUserMedia: vi.fn(),
                },
                serviceWorker: {},
            },
            configurable: true,
        });

        Object.defineProperty(globalThis, 'window', {
            value: {
                HTMLVideoElement: class MockVideoElement { },
                HTMLCanvasElement: class MockCanvasElement { },
            },
            configurable: true,
        });

        const support = checkBrowserSupport();
        expect(support.isSupported).toBe(true);
        expect(support.missingFeatures).toHaveLength(0);
    });

    it('should detect missing mediaDevices API', () => {
        Object.defineProperty(globalThis, 'navigator', {
            value: {
                mediaDevices: undefined,
            },
            configurable: true,
        });

        const support = checkBrowserSupport();
        expect(support.isSupported).toBe(false);
        expect(support.missingFeatures).toContain('MediaDevices API');
    });

    it('should detect missing getUserMedia', () => {
        Object.defineProperty(globalThis, 'navigator', {
            value: {
                mediaDevices: {},
            },
            configurable: true,
        });

        const support = checkBrowserSupport();
        expect(support.isSupported).toBe(false);
        expect(support.missingFeatures).toContain('getUserMedia');
    });

    it('should detect missing service worker support', () => {
        Object.defineProperty(globalThis, 'navigator', {
            value: {
                mediaDevices: {
                    getUserMedia: vi.fn(),
                },
                // No serviceWorker property
            },
            configurable: true,
        });

        const support = checkBrowserSupport();
        expect(support.isSupported).toBe(false);
        expect(support.missingFeatures).toContain('Service Worker');
    });
}); 