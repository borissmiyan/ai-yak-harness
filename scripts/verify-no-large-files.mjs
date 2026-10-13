#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';

/**
 * 🛡️ Pre-Commit Large Files Guard (Tier-3 AI Harness Gate)
 * 
 * Предотвращает случайное попадание тяжелых бинарников, дампов баз данных
 * или бандлов (> 2 MB) в Git историю, раздувающих репозиторий.
 * 
 * Если это намеренная фиксация файла:
 * Запустите с флагом: ALLOW_LARGE_FILES=true git commit ...
 */

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

function runCommand(cmd) {
    try {
        return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    } catch {
        return '';
    }
}

function verifyNoLargeFiles() {
    if (process.env.ALLOW_LARGE_FILES === 'true') {
        console.log('🛡️ [Large Files Guard] Проверка размера файлов пропущена флагом ALLOW_LARGE_FILES=true.');
        process.exit(0);
    }

    const stagedOutput = runCommand('git diff --cached --name-only --diff-filter=ACM');
    if (!stagedOutput) {
        process.exit(0);
    }

    const files = stagedOutput.split('\n').filter(Boolean);
    const oversizedFiles = [];

    for (const file of files) {
        if (!fs.existsSync(file)) {
            continue;
        }

        try {
            const stats = fs.statSync(file);
            if (stats.size > MAX_SIZE_BYTES) {
                oversizedFiles.push({
                    file,
                    sizeMb: (stats.size / (1024 * 1024)).toFixed(2)
                });
            }
        } catch {
            // Игнорируем файлы, к которым нет доступа
        }
    }

    if (oversizedFiles.length > 0) {
        console.error('\n' + '='.repeat(68));
        console.error('🛑 [AI HARNESS GATE] ОБНАРУЖЕНЫ СЛИШКОМ БОЛЬШИЕ ФАЙЛЫ (> 2 MB)!');
        console.error('='.repeat(68));
        console.error('Хук заблокировал коммит, чтобы предотвратить раздувание Git истории:\n');

        oversizedFiles.forEach(item => {
            console.error(`  ❌ Файл:   ${item.file}`);
            console.error(`     Размер: ${item.sizeMb} MB (Лимит: 2.00 MB)\n`);
        });

        console.error('Что делать:');
        console.error('  1. Добавьте файл в .gitignore, если это локальный дамп, лог или бандл.');
        console.error('  2. Оптимизируйте/сожмите изображение или медиа-файл.');
        console.error('  3. Используйте Git LFS или внешнее S3/R2 хранилище.');
        console.error('  4. Если файл действительно должен быть в Git:');
        console.error('     👉 ALLOW_LARGE_FILES=true git commit ...\n');
        console.error('='.repeat(68) + '\n');
        process.exit(1);
    }

    process.exit(0);
}

verifyNoLargeFiles();
