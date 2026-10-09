#!/usr/bin/env node
import { execSync } from 'child_process';

/**
 * 🛡️ Diff Budget & Scope Lock Guard (Эшелон 1 AI-Харнесса)
 * 
 * Ограничивает объем разовых изменений ИИ-агента, предотвращая:
 * 1. «Зуд рефакторинга» (когда агент переписывает рабочий чужой код вокруг места правки).
 * 2. Неконтролируемое разрастание диффа и внесение скрытых регрессий.
 * 
 * Лимит по умолчанию:
 * - Максимум 450 строк изменений кода (добавленных/удаленных) в `src/` за один коммит.
 * - Максимум 10 файлов с кодом за один коммит.
 * 
 * Если изменение крупное и санкционировано разработчиком:
 * Запустите с флагом: ALLOW_LARGE_DIFF=true git commit ...
 */

const MAX_DIFF_LINES = 450;
const MAX_CHANGED_CODE_FILES = 10;

function runCommand(cmd) {
    try {
        return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    } catch {
        return '';
    }
}

function verifyDiffBudget() {
    // 1. Проверка явного разрешения разработчиком (через env или commit message)
    const commitMsg = runCommand('git log -1 --pretty=%B');
    if (
        process.env.ALLOW_LARGE_DIFF === 'true' ||
        process.env.ALLOW_TEST_MUTATION === 'true' ||
        process.env.ALLOW_TEST_EDITS === 'true' ||
        commitMsg.includes('ALLOW_LARGE_DIFF=true') ||
        commitMsg.includes('ALLOW_TEST_MUTATION=true')
    ) {
        console.log('🛡️ [Diff Budget Guard] Большой объем диффа разрешен флагом (ALLOW_LARGE_DIFF=true).');
        process.exit(0);
    }

    // 2. Получаем numstat изменений
    let numstatOutput = runCommand('git diff --cached --numstat');
    if (!numstatOutput) {
        numstatOutput = runCommand('git diff --numstat');
        if (!numstatOutput && process.env.CI) {
            const targetBranch = process.env.GITHUB_BASE_REF;
            if (targetBranch) {
                numstatOutput = runCommand(`git diff --numstat origin/${targetBranch}...HEAD`) || runCommand(`git diff --numstat ${targetBranch}...HEAD`);
            } else {
                numstatOutput = runCommand('git diff --numstat HEAD~1');
            }
        }
    }

    if (!numstatOutput) {
        process.exit(0);
    }

    // Файлы, исключаемые из подсчета (документация, lock-файлы, сгенерированные графы)
    const ignoredPatterns = [
        /^package-lock\.json$/,
        /^graphify-out\//,
        /^dist\//,
        /^docs\//,
        /\.md$/i,
        /^tsconfig.*\.json$/,
        /^\.husky\//,
        /^scripts\//
    ];

    const lines = numstatOutput.split('\n').filter(Boolean);
    let totalLinesChanged = 0;
    const changedCodeFiles = [];

    for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length < 3) continue;

        const [addedStr, deletedStr, filePath] = parts;
        if (!filePath) continue;

        // Проверяем, игнорируется ли файл
        const isIgnored = ignoredPatterns.some(p => p.test(filePath));
        if (isIgnored) continue;

        // Учитываем только код и стили в src/
        if (!filePath.startsWith('src/')) continue;

        const added = parseInt(addedStr, 10) || 0;
        const deleted = parseInt(deletedStr, 10) || 0;
        const fileChanges = added + deleted;

        totalLinesChanged += fileChanges;
        changedCodeFiles.push({ file: filePath, added, deleted, total: fileChanges });
    }

    const filesCount = changedCodeFiles.length;

    // 3. Проверка превышения бюджета
    const exceedsLines = totalLinesChanged > MAX_DIFF_LINES;
    const exceedsFiles = filesCount > MAX_CHANGED_CODE_FILES;

    if (exceedsLines || exceedsFiles) {
        console.error('\n' + '='.repeat(68));
        console.error('🛑 [AI HARNESS GATE] ПРЕВЫШЕН БЮДЖЕТ ИЗМЕНЕНИЙ (DIFF BUDGET EXCEEDED)');
        console.error('='.repeat(68));
        console.error('Принцип Scope Lock запрещает ИИ-агентам делать крупномасштабные');
        console.error('неконтролируемые правки кода в рамках одной атомарной задачи.\n');

        if (exceedsLines) {
            console.error(`  ⚠️ Изменено строк кода: ${totalLinesChanged} (Лимит: ${MAX_DIFF_LINES})`);
        }
        if (exceedsFiles) {
            console.error(`  ⚠️ Затронуто файлов с кодом: ${filesCount} (Лимит: ${MAX_CHANGED_CODE_FILES})`);
        }

        console.error('\nСписок затронутых файлов кода:');
        changedCodeFiles.forEach(f => {
            console.error(`  - ${f.file} (+${f.added} / -${f.deleted})`);
        });

        console.error('\nЧто делать:');
        console.error('  1. Разбейте изменения на небольшие атомарные коммиты.');
        console.error('  2. Уберите случайный рефакторинг не связанных с задачей файлов.');
        console.error('  3. Если это санкционированная крупная фича, передайте флаг:');
        console.error('     👉 ALLOW_LARGE_DIFF=true git commit ...\n');
        console.error('='.repeat(68) + '\n');

        process.exit(1);
    }

    process.exit(0);
}

verifyDiffBudget();
