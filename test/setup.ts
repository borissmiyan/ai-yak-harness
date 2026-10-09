import { beforeAll, afterAll } from 'vitest';

/**
 * 🛡️ Hermetic Test Environment Setup (Tier-3 AI Harness Gate)
 * 
 * Гарантирует абсолютную автономность и герметичность юнит/интеграционных тестов:
 * 1. Timezone Hermeticity: Принудительный UTC (исключает сдвиги дат на CI).
 * 2. Navigator Hermeticity: Полифилл глобального объекта navigator.
 * 3. Zero Unmocked Network Gate: Любая непреднамеренная сетевая активность (fetch)
 *    немедленно блокируется исключением с понятной инструкцией по мокированию.
 */

// 1. Timezone Hermeticity: Force UTC to prevent local date parsing drift
if (typeof process !== 'undefined' && process.env) {
    process.env.TZ = 'UTC';
}

// 2. Global Navigator Hermeticity: Ensure navigator is always defined across all Node runtimes
if (typeof globalThis.navigator === 'undefined') {
    Object.defineProperty(globalThis, 'navigator', {
        value: {
            onLine: true,
            userAgent: 'node-test-runner',
        },
        writable: true,
        configurable: true,
    });
}

const originalFetch = globalThis.fetch;

beforeAll(() => {
    globalThis.fetch = ((input: RequestInfo | URL) => {
        const targetUrl = typeof input === 'string' 
            ? input 
            : input instanceof URL 
                ? input.href 
                : (input as { url?: string })?.url || 'unknown-url';
        
        throw new Error(
            `[Hermetic Test Violation] Unmocked network call attempted to: "${targetUrl}". ` +
            `Unit tests must be completely deterministic and offline. ` +
            `Please mock this request using vi.fn() or vi.spyOn(globalThis, 'fetch').`
        );
    }) as typeof fetch;
});

afterAll(() => {
    globalThis.fetch = originalFetch;
});
