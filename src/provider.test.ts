import { describe, it, expect } from 'vitest';
import { ProviderRegistry } from './scanners/ProviderRegistry';
import { ZXingProvider } from './scanners/providers/zxingProvider';

describe('Provider System', () => {
    describe('ProviderRegistry', () => {
        it('should be a singleton', () => {
            const registry1 = ProviderRegistry.getInstance();
            const registry2 = ProviderRegistry.getInstance();
            expect(registry1).toBe(registry2);
        });

        it('should return available providers', () => {
            const registry = ProviderRegistry.getInstance();
            const providers = registry.getAvailableProviders();

            expect(providers.length).toBeGreaterThanOrEqual(1);
            const zx = providers.find(p => p.name === 'zxing');
            expect(zx).toBeTruthy();
            expect(zx!.displayName).toBe('ZXing');
        });

        it('should load ZXing provider', async () => {
            const registry = ProviderRegistry.getInstance();
            const provider = await registry.loadProvider('zxing');

            expect(provider).toBeInstanceOf(ZXingProvider);
            expect(provider.name).toBe('ZXing');
        });

        it('should cache loaded providers', async () => {
            const registry = ProviderRegistry.getInstance();
            const provider1 = await registry.loadProvider('zxing');
            const provider2 = await registry.loadProvider('zxing');

            expect(provider1).toBe(provider2);
        });

        it('should throw error for unknown provider', async () => {
            const registry = ProviderRegistry.getInstance();

            await expect(registry.loadProvider('unknown')).rejects.toThrow('Unknown provider: unknown');
        });

        it('should set current provider', async () => {
            const registry = ProviderRegistry.getInstance();
            const provider = await registry.setCurrentProvider('zxing');

            expect(registry.getCurrentProvider()).toBe(provider);
        });
    });

    describe('ZXingProvider', () => {
        it('should initialize successfully', async () => {
            const provider = new ZXingProvider();
            await provider.init();

            expect(provider.name).toBe('ZXing');
        });

        it('should scan image with mock data', async () => {
            const provider = new ZXingProvider();
            await provider.init();

            // Create a mock canvas
            const canvas = document.createElement('canvas');
            canvas.width = 100;
            canvas.height = 100;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Draw a simple pattern (this won't be a real barcode, so it should return null)
                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, 100, 100);
            }

            // Should return null for non-barcode image
            const result = await provider.scanImage(canvas);
            expect(result).toBeNull();
        });

        it.skip('should handle video frame scanning (jsdom lacks canvas context)', async () => {
            const provider = new ZXingProvider();
            await provider.init();

            // Create mock video and canvas elements
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');

            // Mock video dimensions
            Object.defineProperty(video, 'videoWidth', { value: 640 });
            Object.defineProperty(video, 'videoHeight', { value: 480 });

            // Should return null for empty frame
            const result = await provider.scanVideoFrame(video, canvas);
            expect(result).toBeNull();
        });

        it('should cleanup properly', () => {
            const provider = new ZXingProvider();

            // Should not throw when destroying uninitialized provider
            expect(() => provider.destroy()).not.toThrow();
        });
    });
}); 