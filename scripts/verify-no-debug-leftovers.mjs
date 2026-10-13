#!/usr/bin/env node
import { execSync } from 'child_process';

/**
 * 🛡️ Pre-Commit Debug Leftovers Guard (Tier-3 AI Harness Gate)
 * 
 * Предотвращает случайную фиксацию в Git забытых отладочных инструкций:
 * - it.only, describe.only, test.only, fit, fdescribe (блокируют запуск полного набора тестов)
 * - debugger; (ломает выполнение в рантайме или останавливает браузер/ноду)
 * 
 * Если это намеренный запуск/тест:
 * Запустите с флагом: ALLOW_DEBUG_LEFTOVERS=true git commit ...
 */

function runCommand(cmd) {
    try {
        return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    } catch {
        return '';
    }
}

function verifyNoDebugLeftovers() {
    if (process.env.ALLOW_DEBUG_LEFTOVERS === 'true') {
        console.log('🛡️ [Debug Leftovers Guard] Проверка пропущена флагом ALLOW_DEBUG_LEFTOVERS=true.');
        process.exit(0);
    }

    let diffOutput = runCommand('git diff --cached -U0');
    if (!diffOutput) {
        diffOutput = runCommand('git diff -U0');
    }

    if (!diffOutput) {
        process.exit(0);
    }

    const targetExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
    const detectedIssues = [];

    const lines = diffOutput.split('\n');
    let currentFile = '';

    for (const line of lines) {
        if (line.startsWith('+++ b/')) {
            currentFile = line.slice(6);
            continue;
        }

        // Проверяем только добавленные строки
        if (!line.startsWith('+') || line.startsWith('+++')) {
            continue;
        }

        const ext = currentFile.slice(currentFile.lastIndexOf('.'));
        if (!targetExtensions.includes(ext)) {
            continue;
        }

        const addedContent = line.slice(1);
        const trimmed = addedContent.trim();

        // Пропускаем однострочные комментарии и строки JSDoc
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
            continue;
        }

        // 1. Поиск эксклюзивных запусков тестов (.only / fit / fdescribe)
        const onlyMatch = trimmed.match(/\b(it|describe|test)\.only\s*\(/) || trimmed.match(/\b(fit|fdescribe)\s*\(/);
        if (onlyMatch) {
            detectedIssues.push({
                file: currentFile,
                type: `Focused test modifier: "${onlyMatch[0].trim()}"`,
                snippet: trimmed.slice(0, 100)
            });
            continue;
        }

        // 2. Поиск инструкции debugger
        const debuggerMatch = trimmed.match(/(?:^|[^\w$])debugger\s*(?:;|$)/);
        if (debuggerMatch) {
            detectedIssues.push({
                file: currentFile,
                type: 'Standalone "debugger" statement',
                snippet: trimmed.slice(0, 100)
            });
        }
    }

    if (detectedIssues.length > 0) {
        console.error('\n' + '='.repeat(68));
        console.error('🛑 [AI HARNESS GATE] ОБНАРУЖЕНЫ ОТЛАДОЧНЫЕ АРТЕФАКТЫ (DEBUG LEFTOVERS)!');
        console.error('='.repeat(68));
        console.error('Хук заблокировал коммит, так как в коде найдены оставленные .only или debugger.\n');

        detectedIssues.forEach(issue => {
            console.error(`  ❌ Файл: ${issue.file}`);
            console.error(`     Тип:  ${issue.type}`);
            console.error(`     Код:  ${issue.snippet}\n`);
        });

        console.error('Что делать:');
        console.error('  1. Удалите .only из тестов, чтобы запускался весь тестовый набор.');
        console.error('  2. Удалите инструкции debugger.');
        console.error('  3. Если это осознанный временный коммит:');
        console.error('     👉 ALLOW_DEBUG_LEFTOVERS=true git commit ...\n');
        console.error('='.repeat(68) + '\n');
        process.exit(1);
    }

    process.exit(0);
}

verifyNoDebugLeftovers();
