/**
 * Utility functions for the barcode scanner app
 */
import { logger } from './logger';

/**
 * Validates if a string is a valid URL
 */
export function isValidUrl(text: string): boolean {
    try {
        new URL(text);
        return true;
    } catch {
        return false;
    }
}

/**
 * Throttles function calls to a maximum frequency
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    let lastCall = 0;
    return (...args: Parameters<T>) => {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            func(...args);
        }
    };
}

/**
 * Formats error messages for user display
 */
export function formatErrorMessage(error: Error): string {
    if (error.name === 'NotAllowedError') {
        return 'Camera permission denied. Please allow camera access and try again.';
    }
    if (error.name === 'NotFoundError') {
        return 'No camera found on this device.';
    }
    if (error.name === 'NotSupportedError') {
        return 'Camera not supported in this browser.';
    }
    if (error.name === 'OverconstrainedError') {
        return 'Camera constraints not supported. Trying with default settings.';
    }
    return `Error: ${error.message}`;
}

/**
 * Checks if the current environment supports the required APIs
 */
export function checkBrowserSupport(): {
    isSupported: boolean;
    missingFeatures: string[];
} {
    logger.debug('Utils', 'Checking browser support for required APIs');
    const missingFeatures: string[] = [];

    if (!navigator.mediaDevices) {
        missingFeatures.push('MediaDevices API');
    }
    if (!navigator.mediaDevices?.getUserMedia) {
        missingFeatures.push('getUserMedia');
    }
    if (!window.HTMLVideoElement) {
        missingFeatures.push('HTMLVideoElement');
    }
    if (!window.HTMLCanvasElement) {
        missingFeatures.push('HTMLCanvasElement');
    }
    if (!('serviceWorker' in navigator)) {
        missingFeatures.push('Service Worker');
    }

    const result = {
        isSupported: missingFeatures.length === 0,
        missingFeatures,
    };

    if (result.isSupported) {
        logger.info('Utils', 'Browser support check passed - all APIs available');
    } else {
        logger.warn('Utils', 'Browser support check failed', { missingFeatures });
    }

    return result;
}

/**
 * Debounces function calls
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
} 