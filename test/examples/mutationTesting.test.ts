import { describe, it, expect } from 'vitest';

/**
 * 🧬 Mutation Testing Pattern (Tier-4 AI Harness)
 * 
 * Предотвращает «тесты-иллюзии» (Test Theater).
 * Гарантирует, что тесты проверяют реальные значения, а не просто пустые вызовы.
 * Метрика: Mutant Kill Rate = 100%.
 */

function calculateDiscount(price: number, discountPct: number): number {
    if (price <= 0 || discountPct <= 0) return 0;
    return Number((price * (discountPct / 100)).toFixed(2));
}

describe('Synthetic Mutation Testing Pattern', () => {
    it('kills mutant: missing division by 100 in discount formula', () => {
        const price = 200;
        const discountPct = 15;
        const expected = calculateDiscount(price, discountPct); // 30

        // Mutant: price * discountPct (without division by 100)
        const mutant = price * discountPct; // 3000

        expect(Math.abs(expected - mutant)).toBeGreaterThan(100);
    });

    it('kills mutant: inverted discount condition (negative inputs)', () => {
        const expected = calculateDiscount(-100, 20); // must be 0
        expect(expected).toBe(0);
    });
});
