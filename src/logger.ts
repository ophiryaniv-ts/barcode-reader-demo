/**
 * Logger utility for the barcode scanner app
 * Provides structured logging with categories, levels, and timing
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogCategory = 'App' | 'Scanner' | 'UI' | 'Upload' | 'ServiceWorker' | 'Utils' | 'ProviderRegistry' | 'ZXingProvider' | 'Quagga2Provider' | 'BarcodeDetectorProvider' | 'BenchmarkRunner';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    category: LogCategory;
    message: string;
    data?: any;
    error?: Error;
}

class Logger {
    private isDevelopment: boolean;
    private activeTimers: Map<string, number> = new Map();
    private groupStack: string[] = [];

    constructor() {
        this.isDevelopment = import.meta.env.DEV || false;
    }

    private formatTimestamp(): string {
        return new Date().toISOString().split('T')[1].slice(0, -1);
    }

    private getLogStyle(level: LogLevel): string {
        const styles = {
            debug: 'color: #6c757d; font-weight: normal;',
            info: 'color: #007bff; font-weight: bold;',
            warn: 'color: #ffc107; font-weight: bold;',
            error: 'color: #dc3545; font-weight: bold;',
        };
        return styles[level];
    }

    private getCategoryStyle(category: LogCategory): string {
        const styles = {
            App: 'background: #007bff; color: white; padding: 2px 6px; border-radius: 3px;',
            Scanner: 'background: #28a745; color: white; padding: 2px 6px; border-radius: 3px;',
            UI: 'background: #6f42c1; color: white; padding: 2px 6px; border-radius: 3px;',
            Upload: 'background: #fd7e14; color: white; padding: 2px 6px; border-radius: 3px;',
            ServiceWorker: 'background: #20c997; color: white; padding: 2px 6px; border-radius: 3px;',
            Utils: 'background: #6c757d; color: white; padding: 2px 6px; border-radius: 3px;',
            ProviderRegistry: 'background: #e83e8c; color: white; padding: 2px 6px; border-radius: 3px;',
            ZXingProvider: 'background: #17a2b8; color: white; padding: 2px 6px; border-radius: 3px;',
            Quagga2Provider: 'background: #6610f2; color: white; padding: 2px 6px; border-radius: 3px;',
            BarcodeDetectorProvider: 'background: #15ca20; color: white; padding: 2px 6px; border-radius: 3px;',
            BenchmarkRunner: 'background: #fd7e14; color: white; padding: 2px 6px; border-radius: 3px;',
        };
        return styles[category];
    }

    private log(level: LogLevel, category: LogCategory, message: string, data?: any, error?: Error): void {
        if (!this.isDevelopment && level === 'debug') {
            return; // Skip debug logs in production
        }

        const timestamp = this.formatTimestamp();
        const logEntry: LogEntry = {
            timestamp,
            level,
            category,
            message,
            data,
            error,
        };

        // Create console output with styling
        const categoryStyle = this.getCategoryStyle(category);
        const levelStyle = this.getLogStyle(level);
        const indent = '  '.repeat(this.groupStack.length);

        const consoleArgs = [
            `${indent}%c${category}%c %c${level.toUpperCase()}%c ${timestamp} - ${message}`,
            categoryStyle,
            'color: inherit;',
            levelStyle,
            'color: inherit;',
        ];

        // Add data if provided
        if (data !== undefined) {
            consoleArgs.push('\n📊 Data:', data);
        }

        // Add error note if provided (actual error logged separately)
        if (error) {
            consoleArgs.push('\n❌ Error details below ↓');
        }

        // Use appropriate console method
        switch (level) {
            case 'debug':
                console.debug(...consoleArgs);
                if (error) console.debug(error);
                break;
            case 'info':
                console.info(...consoleArgs);
                if (error) console.info(error);
                break;
            case 'warn':
                console.warn(...consoleArgs);
                if (error) console.warn(error);
                break;
            case 'error':
                console.error(...consoleArgs);
                if (error) console.error(error);
                break;
        }

        // Store in session storage for debugging (optional)
        if (this.isDevelopment) {
            this.storeLogEntry(logEntry);
        }
    }

    private storeLogEntry(entry: LogEntry): void {
        try {
            const logs = JSON.parse(sessionStorage.getItem('barcode-scanner-logs') || '[]');
            logs.push(entry);

            // Keep only last 100 entries
            if (logs.length > 100) {
                logs.splice(0, logs.length - 100);
            }

            sessionStorage.setItem('barcode-scanner-logs', JSON.stringify(logs));
        } catch (error) {
            // Ignore storage errors
        }
    }

    // Public logging methods
    debug(category: LogCategory, message: string, data?: any): void {
        this.log('debug', category, message, data);
    }

    info(category: LogCategory, message: string, data?: any): void {
        this.log('info', category, message, data);
    }

    warn(category: LogCategory, message: string, data?: any): void {
        this.log('warn', category, message, data);
    }

    error(category: LogCategory, message: string, error?: Error, data?: any): void {
        this.log('error', category, message, data, error);
    }

    // Timing methods
    time(label: string): void {
        this.activeTimers.set(label, performance.now());
        this.debug('Utils', `⏱️ Timer started: ${label}`);
    }

    timeEnd(label: string): void {
        const startTime = this.activeTimers.get(label);
        if (startTime !== undefined) {
            const duration = performance.now() - startTime;
            this.activeTimers.delete(label);
            this.info('Utils', `⏱️ Timer ended: ${label}`, { duration: `${duration.toFixed(2)}ms` });
        } else {
            this.warn('Utils', `⏱️ Timer not found: ${label}`);
        }
    }

    // Grouping methods
    group(category: LogCategory, title: string): void {
        this.groupStack.push(title);
        const indent = '  '.repeat(this.groupStack.length - 1);
        console.group(`${indent}🔽 ${title}`);
        this.debug(category, `Group started: ${title}`);
    }

    groupEnd(): void {
        if (this.groupStack.length > 0) {
            const title = this.groupStack.pop();
            console.groupEnd();
            this.debug('Utils', `Group ended: ${title}`);
        }
    }

    // Utility methods
    clearLogs(): void {
        try {
            sessionStorage.removeItem('barcode-scanner-logs');
            console.clear();
            this.info('Utils', 'Logs cleared');
        } catch (error) {
            this.warn('Utils', 'Failed to clear logs');
        }
    }

    exportLogs(): LogEntry[] {
        try {
            return JSON.parse(sessionStorage.getItem('barcode-scanner-logs') || '[]');
        } catch (error) {
            this.warn('Utils', 'Failed to export logs');
            return [];
        }
    }

    // Performance monitoring
    measure(name: string, fn: () => any): any {
        this.time(name);
        try {
            const result = fn();
            this.timeEnd(name);
            return result;
        } catch (error) {
            this.timeEnd(name);
            this.error('Utils', `Performance measurement failed: ${name}`, error as Error);
            throw error;
        }
    }

    async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
        this.time(name);
        try {
            const result = await fn();
            this.timeEnd(name);
            return result;
        } catch (error) {
            this.timeEnd(name);
            this.error('Utils', `Async performance measurement failed: ${name}`, error as Error);
            throw error;
        }
    }
}

// Export singleton instance
export const logger = new Logger();

// Add global access for debugging in console
if (typeof window !== 'undefined') {
    (window as any).logger = logger;
} 