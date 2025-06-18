import { ProviderRegistry } from './scanners/ProviderRegistry';
import { logger } from './logger';

export interface BenchmarkResult {
    providerName: string;
    success: boolean;
    duration: number;
    error?: string;
    result?: string;
}

export interface BenchmarkReport {
    testName: string;
    results: BenchmarkResult[];
    summary: {
        fastestProvider: string | null;
        averageDuration: number;
        successRate: number;
    };
}

export class BenchmarkRunner {
    private registry: ProviderRegistry;

    constructor() {
        this.registry = ProviderRegistry.getInstance();
    }

    async benchmarkImageScan(imageFile: File): Promise<BenchmarkReport> {
        logger.info('BenchmarkRunner', 'Starting image scan benchmark', { fileName: imageFile.name });

        const providers = this.registry.getAvailableProviders();
        const results: BenchmarkResult[] = [];

        // Create image element for testing
        const img = await this.loadImage(imageFile);

        for (const providerInfo of providers) {
            logger.info('BenchmarkRunner', `Testing provider: ${providerInfo.displayName}`);

            try {
                const startTime = performance.now();
                const provider = await this.registry.loadProvider(providerInfo.name);

                const scanResult = await provider.scanImage(img);
                const duration = performance.now() - startTime;

                results.push({
                    providerName: providerInfo.displayName,
                    success: scanResult !== null,
                    duration,
                    result: scanResult || undefined
                });

                logger.debug('BenchmarkRunner', `Provider ${providerInfo.displayName} completed`, {
                    success: scanResult !== null,
                    duration: `${duration.toFixed(2)}ms`,
                    result: scanResult
                });

            } catch (error) {
                const duration = performance.now() - performance.now(); // Minimal duration for failed attempts
                results.push({
                    providerName: providerInfo.displayName,
                    success: false,
                    duration,
                    error: (error as Error).message
                });

                logger.warn('BenchmarkRunner', `Provider ${providerInfo.displayName} failed`, error as Error);
            }
        }

        const report = this.generateReport(`Image Scan - ${imageFile.name}`, results);
        logger.info('BenchmarkRunner', 'Benchmark completed', report.summary);

        return report;
    }

    async benchmarkVideoFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement, iterations: number = 10): Promise<BenchmarkReport> {
        logger.info('BenchmarkRunner', 'Starting video frame benchmark', { iterations });

        const providers = this.registry.getAvailableProviders();
        const allResults: BenchmarkResult[] = [];

        for (const providerInfo of providers) {
            logger.info('BenchmarkRunner', `Testing provider: ${providerInfo.displayName}`);

            const providerResults: BenchmarkResult[] = [];

            try {
                const provider = await this.registry.loadProvider(providerInfo.name);

                // Run multiple iterations
                for (let i = 0; i < iterations; i++) {
                    try {
                        const startTime = performance.now();
                        const scanResult = await provider.scanVideoFrame(video, canvas);
                        const duration = performance.now() - startTime;

                        providerResults.push({
                            providerName: providerInfo.displayName,
                            success: scanResult !== null,
                            duration,
                            result: scanResult || undefined
                        });

                        // Add small delay between iterations
                        await new Promise(resolve => setTimeout(resolve, 10));
                    } catch (error) {
                        providerResults.push({
                            providerName: providerInfo.displayName,
                            success: false,
                            duration: 0,
                            error: (error as Error).message
                        });
                    }
                }

                // Calculate average for this provider
                const successfulResults = providerResults.filter(r => r.success);
                const averageDuration = successfulResults.length > 0
                    ? successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length
                    : 0;

                allResults.push({
                    providerName: providerInfo.displayName,
                    success: successfulResults.length > 0,
                    duration: averageDuration,
                    result: successfulResults.length > 0 ? `${successfulResults.length}/${iterations} successful` : undefined,
                    error: successfulResults.length === 0 ? 'All iterations failed' : undefined
                });

                logger.debug('BenchmarkRunner', `Provider ${providerInfo.displayName} average`, {
                    averageDuration: `${averageDuration.toFixed(2)}ms`,
                    successRate: `${successfulResults.length}/${iterations}`
                });

            } catch (error) {
                allResults.push({
                    providerName: providerInfo.displayName,
                    success: false,
                    duration: 0,
                    error: (error as Error).message
                });

                logger.warn('BenchmarkRunner', `Provider ${providerInfo.displayName} failed to initialize`, error as Error);
            }
        }

        const report = this.generateReport(`Video Frame Scan (${iterations} iterations)`, allResults);
        logger.info('BenchmarkRunner', 'Video benchmark completed', report.summary);

        return report;
    }

    private async loadImage(file: File): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image'));

            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    img.src = e.target.result as string;
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    }

    private generateReport(testName: string, results: BenchmarkResult[]): BenchmarkReport {
        const successfulResults = results.filter(r => r.success);
        const fastestProvider = successfulResults.length > 0
            ? successfulResults.reduce((fastest, current) =>
                current.duration < fastest.duration ? current : fastest
            ).providerName
            : null;

        const averageDuration = successfulResults.length > 0
            ? successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length
            : 0;

        const successRate = results.length > 0 ? successfulResults.length / results.length : 0;

        return {
            testName,
            results,
            summary: {
                fastestProvider,
                averageDuration,
                successRate
            }
        };
    }

    exportReport(report: BenchmarkReport): string {
        const lines = [
            `# ${report.testName}`,
            '',
            '## Summary',
            `- Fastest Provider: ${report.summary.fastestProvider || 'None'}`,
            `- Average Duration: ${report.summary.averageDuration.toFixed(2)}ms`,
            `- Success Rate: ${(report.summary.successRate * 100).toFixed(1)}%`,
            '',
            '## Results',
            '| Provider | Success | Duration (ms) | Result | Error |',
            '|----------|---------|---------------|---------|--------|'
        ];

        for (const result of report.results) {
            lines.push(
                `| ${result.providerName} | ${result.success ? '✅' : '❌'} | ${result.duration.toFixed(2)} | ${result.result || '-'} | ${result.error || '-'} |`
            );
        }

        return lines.join('\n');
    }
}

// Export singleton instance
export const benchmarkRunner = new BenchmarkRunner();

// Add global access for testing in console
if (typeof window !== 'undefined') {
    (window as any).benchmarkRunner = benchmarkRunner;
} 