import { logger } from './logger';

export async function registerServiceWorker(): Promise<void> {
    logger.info('ServiceWorker', 'Attempting to register service worker');

    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            logger.info('ServiceWorker', 'Service Worker registered successfully', {
                scope: registration.scope,
                updateViaCache: registration.updateViaCache
            });

            // Handle updates
            registration.addEventListener('updatefound', () => {
                logger.info('ServiceWorker', 'Service Worker update found');
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        logger.debug('ServiceWorker', 'Service Worker state changed', {
                            state: newWorker.state
                        });

                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            logger.info('ServiceWorker', 'New app version available');
                            // Could show update notification here
                        }
                    });
                }
            });
        } catch (error) {
            logger.error('ServiceWorker', 'Service Worker registration failed', error as Error);
        }
    } else {
        logger.warn('ServiceWorker', 'Service Worker not supported in this browser');
    }
} 