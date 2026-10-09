/**
 * 🎲 Deterministic Test Fixture Factory (Tier-4 AI Harness)
 * 
 * Предоставляет 100% воспроизводимые генераторы моковых данных для тестов.
 * Исключает флаки-тесты, вызванные недетерминированным Math.random() или плавающими датами.
 */

/**
 * Mulberry32 32-bit deterministic PRNG
 * @param seed Целое число сида (напр. 42)
 * @returns Функция-генератор псевдослучайных чисел от 0 до 1
 */
export function createPrng(seed: number) {
    let s = Math.floor(seed) >>> 0;
    return function next() {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Пример универсальной фабрики для доменной сущности (User/Item/Report)
 */
export function createMockItem(seed = 42, overrides: Record<string, unknown> = {}) {
    const random = createPrng(seed);
    const itemNum = 1000 + Math.floor(random() * 9000);
    const id = `item-${seed}-${itemNum}`;

    return {
        id,
        name: `Test Item ${itemNum}`,
        code: `CODE-${itemNum}`,
        score: Number((random() * 100).toFixed(2)),
        isActive: random() > 0.3,
        createdAt: '2026-06-15T08:00:00.000Z',
        ...overrides,
    };
}
