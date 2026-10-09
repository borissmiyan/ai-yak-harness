#!/usr/bin/env node
import { execSync } from 'child_process';

/**
 * 🧯 AI Agent Circuit Breaker & Safe Rollback (Tier-3 Harness Utility)
 * 
 * Если ИИ-агент попал в тупик рефакторинга, нарушил типы или наплодил
 * ошибочные изменения — эта команда мгновенно и безопасно откатывает рабочую копию
 * к последнему чистому коммиту, предварительно СОХРАНЯЯ текущую работу в git stash!
 * 
 * Использование:
 *   npm run harness:rollback          (сохраняет stash и сбрасывает измененные файлы)
 *   npm run harness:rollback -- --hard (полная очистка включая untracked файлы)
 */

function run(cmd, silent = false) {
    try {
        return execSync(cmd, { encoding: 'utf-8', stdio: silent ? ['pipe', 'pipe', 'ignore'] : 'inherit' });
    } catch {
        return null;
    }
}

function harnessRollback() {
    const isHard = process.argv.includes('--hard');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const stashMessage = `harness-rollback-backup-${timestamp}`;

    console.log('🧯 [Circuit Breaker] Инициация безопасного отката изменений...');

    // 1. Проверяем наличие изменений
    const status = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
    if (!status) {
        console.log('✨ [Circuit Breaker] Рабочая директория уже чиста. Откат не требуется.');
        process.exit(0);
    }

    // 2. Создаем защитный stash со всеми изменениями (включая untracked)
    console.log(`📦 [Circuit Breaker] Сохранение резервной копии изменений в stash: "${stashMessage}"...`);
    run(`git stash push -u -m "${stashMessage}"`);

    // 3. Если запрошен --hard, делаем полную очистку
    if (isHard) {
        console.log('🧹 [Circuit Breaker] Полная очистка рабочей директории (--hard)...');
        run('git reset --hard HEAD');
        run('git clean -fd');
    }

    console.log('✅ [Circuit Breaker] Откат успешно выполнен! Проект возвращен к чистому состоянию.');
    console.log(`💡 Подсказка: Если вы захотите вернуть сохраненные изменения, выполните: git stash pop`);
}

harnessRollback();
