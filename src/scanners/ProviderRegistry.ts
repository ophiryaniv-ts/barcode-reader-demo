import type { IBarcodeProvider } from './IBarcodeProvider';
import { logger } from '../logger';

export interface ProviderInfo {
    name: string;
    displayName: string;
    description: string;
    loader: () => Promise<new () => IBarcodeProvider>;
}

export class ProviderRegistry {
    private static instance: ProviderRegistry;
    private providers: Map<string, ProviderInfo> = new Map();
    private loadedProviders: Map<string, IBarcodeProvider> = new Map();
    private currentProvider: IBarcodeProvider | null = null;

    private constructor() {
        this.registerDefaultProviders();
    }

    static getInstance(): ProviderRegistry {
        if (!ProviderRegistry.instance) {
            ProviderRegistry.instance = new ProviderRegistry();
        }
        return ProviderRegistry.instance;
    }

    private registerDefaultProviders(): void {
        // Register ZXing provider
        this.providers.set('zxing', {
            name: 'zxing',
            displayName: 'ZXing',
            description: 'Fast and reliable barcode scanner supporting QR codes and PDF417',
            loader: async () => {
                const { ZXingProvider } = await import('./providers/zxingProvider');
                return ZXingProvider;
            }
        });

        // Register Native BarcodeDetector provider (Chrome/Edge only)
        this.providers.set('barcode-detector', {
            name: 'barcode-detector',
            displayName: 'BarcodeDetector (Native)',
            description: 'Native browser API for barcode detection (Chrome/Edge only) - fastest performance',
            loader: async () => {
                const { BarcodeDetectorProvider } = await import('./providers/barcodeDetectorProvider');
                return BarcodeDetectorProvider;
            }
        });

        // Register ZXing WASM provider
        this.providers.set('zxing-wasm', {
            name: 'zxing-wasm',
            displayName: 'ZXing (WASM)',
            description: 'Pure WebAssembly build of ZXing – high performance',
            loader: async () => {
                const { ZXingWasmProvider } = await import('./providers/zxingWasmProvider');
                return ZXingWasmProvider;
            }
        });

        // Register Dynamsoft provider (requires license)
        this.providers.set('dynamsoft', {
            name: 'dynamsoft',
            displayName: 'Dynamsoft SDK',
            description: 'Commercial SDK with industry-leading accuracy (license required)',
            loader: async () => {
                const { DynamsoftProvider } = await import('./providers/dynamsoftProvider');
                return DynamsoftProvider;
            }
        });

        // TODO: Add more providers as they are implemented
        /*
        this.providers.set('quagga2', {
          name: 'quagga2',
          displayName: 'Quagga2',
          description: 'JavaScript barcode scanner with WebAssembly support',
          loader: async () => {
            const { Quagga2Provider } = await import('./providers/quagga2Provider');
            return Quagga2Provider;
          }
        });
        */
    }

    getAvailableProviders(): ProviderInfo[] {
        return Array.from(this.providers.values());
    }

    async loadProvider(providerName: string): Promise<IBarcodeProvider> {
        logger.info('ProviderRegistry', `Loading provider: ${providerName}`);

        // Check if already loaded
        if (this.loadedProviders.has(providerName)) {
            const provider = this.loadedProviders.get(providerName)!;
            logger.debug('ProviderRegistry', `Provider ${providerName} already loaded`);
            return provider;
        }

        // Check if provider exists
        const providerInfo = this.providers.get(providerName);
        if (!providerInfo) {
            throw new Error(`Unknown provider: ${providerName}`);
        }

        try {
            // Load the provider class
            const ProviderClass = await providerInfo.loader();
            const provider = new ProviderClass();

            // Initialize the provider
            await provider.init();

            // Cache the loaded provider
            this.loadedProviders.set(providerName, provider);

            logger.info('ProviderRegistry', `Provider ${providerName} loaded successfully`);
            return provider;
        } catch (error) {
            logger.error('ProviderRegistry', `Failed to load provider ${providerName}`, error as Error);
            throw error;
        }
    }

    async setCurrentProvider(providerName: string): Promise<IBarcodeProvider> {
        // Destroy current provider if exists
        if (this.currentProvider) {
            logger.debug('ProviderRegistry', `Destroying current provider: ${this.currentProvider.name}`);
            this.currentProvider.destroy?.();
        }

        // Load and set new provider
        this.currentProvider = await this.loadProvider(providerName);

        // Save preference to localStorage
        try {
            localStorage.setItem('barcode-scanner-provider', providerName);
        } catch (error) {
            logger.warn('ProviderRegistry', 'Failed to save provider preference', error as Error);
        }

        logger.info('ProviderRegistry', `Current provider set to: ${providerName}`);
        return this.currentProvider;
    }

    getCurrentProvider(): IBarcodeProvider | null {
        return this.currentProvider;
    }

    getPreferredProvider(): string {
        try {
            return localStorage.getItem('barcode-scanner-provider') || 'zxing';
        } catch (error) {
            logger.warn('ProviderRegistry', 'Failed to get provider preference', error as Error);
            return 'zxing';
        }
    }

    async initializeDefaultProvider(): Promise<IBarcodeProvider> {
        const preferredProvider = this.getPreferredProvider();
        logger.info('ProviderRegistry', `Initializing default provider: ${preferredProvider}`);
        return await this.setCurrentProvider(preferredProvider);
    }

    cleanup(): void {
        logger.info('ProviderRegistry', 'Cleaning up all providers');

        // Destroy current provider
        if (this.currentProvider) {
            this.currentProvider.destroy?.();
            this.currentProvider = null;
        }

        // Destroy all loaded providers
        for (const [name, provider] of this.loadedProviders) {
            logger.debug('ProviderRegistry', `Destroying provider: ${name}`);
            provider.destroy?.();
        }

        this.loadedProviders.clear();
    }
} 