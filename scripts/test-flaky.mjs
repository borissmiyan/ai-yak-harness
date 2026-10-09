#!/usr/bin/env node
import { execSync } from 'child_process';

/**
 * 🧪 Flaky Test Hunter & Stress Runner (Tier-3 AI Harness Gate)
 * 
 * Запускает указанный тест (или все измененные тесты) несколько раз подряд,
 * чтобы гарантировать отсутствие race conditions, плавающих таймаутов
 * и несогласованных асинхронных промисов.
 * 
 * Использование:
 *   npm run test:flaky
 *   npm run test:flaky src/path/to/test.test.ts
 */

const args = process.argv.slice(2).join(' ');
const target = args ? ` ${args}` : '';
const REPEAT_COUNT = 3;

console.log(`\n🧪 [Flaky Test Hunter] Запуск стресс-тестирования (${REPEAT_COUNT} прогона подряд)...`);

for (let i = 1; i <= REPEAT_COUNT; i++) {
    process.stdout.write(`\n▶️ Прогон ${i}/${REPEAT_COUNT} ...\n`);
    try {
        execSync(`npx vitest run${target}`, { stdio: 'inherit' });
    } catch (err) {
        console.error(`\n❌ [Flaky Test Hunter] Тест упал на прогоне ${i}! Обнаружена нестабильность (Flakiness).`);
        process.exit(err.status || 1);
    }
}

console.log(`\n✅ [Flaky Test Hunter] Все ${REPEAT_COUNT} прогонов успешно завершены без сбоев!\n`);
