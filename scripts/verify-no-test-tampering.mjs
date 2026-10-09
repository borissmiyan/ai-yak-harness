#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * 🛡️ Anti-Test Tampering & Harness Self-Defense Gate (AI Harness Universal Standard)
 * 
 * Предотвращает ситуацию, когда ИИ-ассистент ломает код, а затем:
 * 1. Молча редактирует существующие тесты, чтобы заставить их "пройти".
 * 2. Ослабляет или вырезает проверочные скрипты в package.json (напр. "check": "echo ok").
 * 3. Самовольно добавляет зависимости в "dependencies" (Package Hallucination / Supply Chain).
 * 4. Отключает или очищает хуки Husky (.husky/pre-commit, .husky/pre-push) или файлы харнесса.
 * 
 * Если изменение легитимно (разработчик намеренно обновляет контракты или конфигурацию):
 * Запустите с флагом: ALLOW_TEST_MUTATION=true git commit ...
 * Или для зависимостей: ALLOW_DEP_MUTATION=true git commit ...
 */

function runCommand(cmd) {
    try {
        return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    } catch {
        return '';
    }
}

function verifyHarnessIntegrity() {
    // 1. Проверка явного разрешения разработчиком (через env или commit message)
    const commitMsg = runCommand('git log -1 --pretty=%B');
    if (
        process.env.ALLOW_TEST_MUTATION === 'true' ||
        process.env.ALLOW_TEST_EDITS === 'true' ||
        commitMsg.includes('ALLOW_TEST_MUTATION=true') ||
        commitMsg.includes('ALLOW_TEST_EDITS=true')
    ) {
        console.log('🛡️ [Anti-Tampering] Изменение тестов и харнесса разрешено (ALLOW_TEST_MUTATION=true).');
        process.exit(0);
    }

    // 2. Проверяем валидность критических скриптов в package.json прямо на диске
    try {
        const pkgPath = path.resolve(process.cwd(), 'package.json');
        if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            const scripts = pkg.scripts || {};

            const requiredSnippets = [
                { name: 'check', snippet: 'tsc', desc: 'Typecheck (tsc)' },
                { name: 'check', snippet: 'eslint', desc: 'Linter (eslint)' },
                { name: 'prepare', snippet: 'husky', desc: 'Husky git hooks' },
            ];

            // Если в проекте есть vitest или jest, проверяем наличие тестов в check
            if (pkg.devDependencies?.vitest || pkg.dependencies?.vitest) {
                requiredSnippets.push({ name: 'check', snippet: 'vitest', desc: 'Vitest test suite' });
            } else if (pkg.devDependencies?.jest || pkg.dependencies?.jest) {
                requiredSnippets.push({ name: 'check', snippet: 'jest', desc: 'Jest test suite' });
            }

            for (const item of requiredSnippets) {
                const scriptVal = scripts[item.name] || '';
                if (!scriptVal.includes(item.snippet)) {
                    console.error('\n' + '='.repeat(68));
                    console.error('🛑 [AI HARNESS GATE] ОБНАРУЖЕНО ОСЛАБЛЕНИЕ СКРИПТОВ PACKAGE.JSON!');
                    console.error('='.repeat(68));
                    console.error(`Скрипт "${item.name}" обязан содержать "${item.snippet}" (${item.desc}).`);
                    console.error(`Текущее значение: "${scriptVal}"\n`);
                    console.error('Для санкционированного изменения передайте: ALLOW_TEST_MUTATION=true');
                    console.error('='.repeat(68) + '\n');
                    process.exit(1);
                }
            }
        }
    } catch (err) {
        console.error('⚠️ Ошибка при чтении package.json:', err.message);
    }

    // 3. Dependency Freeze Gate: Проверяем, не пытался ли агент самовольно добавить runtime dependencies
    if (process.env.ALLOW_DEP_MUTATION !== 'true') {
        const pkgDiff = runCommand('git diff --cached package.json') || runCommand('git diff package.json');
        if (pkgDiff && (/^[+-]\s*"dependencies"\s*:\s*\{/m.test(pkgDiff) || (pkgDiff.includes('"dependencies"') && (pkgDiff.includes('+    "') || pkgDiff.includes('+   "'))))) {
            const hasDepChanges = runCommand('git diff -U0 --cached package.json') || runCommand('git diff -U0 package.json');
            if (hasDepChanges && /"dependencies"[\s\S]*?\}/.test(hasDepChanges)) {
                console.error('\n' + '='.repeat(68));
                console.error('🛑 [AI HARNESS GATE] DEPENDENCY FREEZE: САМОВОЛЬНОЕ ИЗМЕНЕНИЕ ЗАВИСИМОСТЕЙ!');
                console.error('='.repeat(68));
                console.error('ИИ-агентам запрещено изменять секцию "dependencies" во избежание');
                console.error('галлюцинаций пакетов (Package Hallucination) и Supply Chain атак.\n');
                console.error('Если вы разработчик и намеренно ставите библиотеку:');
                console.error('  👉 Передайте флаг: ALLOW_DEP_MUTATION=true git commit ...');
                console.error('  👉 Или: ALLOW_TEST_MUTATION=true git commit ...\n');
                console.error('='.repeat(68) + '\n');
                process.exit(1);
            }
        }
    }

    // 4. Определяем список измененных файлов со статусами
    let diffStatusOutput = '';
    const stagedStatus = runCommand('git diff --cached --name-status');
    if (stagedStatus) {
        diffStatusOutput = stagedStatus;
    } else {
        const workingStatus = runCommand('git diff --name-status');
        if (workingStatus) {
            diffStatusOutput = workingStatus;
        } else if (process.env.CI) {
            const targetBranch = process.env.GITHUB_BASE_REF;
            if (targetBranch) {
                diffStatusOutput = runCommand(`git diff --name-status origin/${targetBranch}...HEAD`) || runCommand(`git diff --name-status ${targetBranch}...HEAD`);
            } else {
                diffStatusOutput = runCommand('git diff --name-status HEAD~1');
            }
        }
    }

    if (!diffStatusOutput) {
        process.exit(0);
    }

    // Парсим строки вида "M\tsrc/file.ts" или "A\te2e/test.ts" или "R100\told\tnew"
    const changedEntries = diffStatusOutput.split('\n').map(line => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        const parts = trimmed.split('\t');
        if (parts.length >= 2) {
            const statusCode = parts[0].trim().toUpperCase();
            const files = parts.slice(1).map(p => p.trim());
            return { statusCode, files };
        }
        return null;
    }).filter(Boolean);

    // Паттерны тестовых файлов
    const testPatterns = [
        /__tests__\//,
        /\.test\.[jt]sx?$/,
        /\.spec\.[jt]sx?$/,
        /^e2e\//,
        /^tests?\//
    ];

    // Паттерны файлов самого харнесса и контрактов (Self-Defense)
    const harnessPatterns = [
        /^\.husky\//,
        /^scripts\/verify-.*\.mjs$/,
        /^scripts\/harness-.*\.mjs$/,
        /^\.github\/workflows\//,
        /^eslint\.config\.[cm]?[jt]s$/,
        /^tsconfig\.test\.json$/,
        /^src\/types\/contracts\//
    ];

    const modifiedTests = [];
    const modifiedHarness = [];

    for (const entry of changedEntries) {
        for (const file of entry.files) {
            // Проверка тестов: добавление НОВЫХ тестов (статус A) разрешено (чистый TDD).
            // Модификация (M), удаление (D) или перемещение (R) существующих тестов запрещены.
            if (testPatterns.some(pattern => pattern.test(file))) {
                if (entry.statusCode !== 'A') {
                    modifiedTests.push(`${entry.statusCode}: ${file}`);
                }
            }

            // Проверка защитного харнесса: любое изменение харнесса (A, M, D, R) блокируется
            if (harnessPatterns.some(pattern => pattern.test(file))) {
                modifiedHarness.push(`${entry.statusCode}: ${file}`);
            }
        }
    }

    if (modifiedTests.length === 0 && modifiedHarness.length === 0) {
        process.exit(0);
    }

    console.error('\n' + '='.repeat(68));
    console.error('🛑 [AI HARNESS GATE] ОБНАРУЖЕНА МОДИФИКАЦИЯ ТЕСТОВ ИЛИ ХАРНЕССА');
    console.error('='.repeat(68));
    console.error('ИИ-агентам запрещено модифицировать существующие тесты или защитный контур');
    console.error('во избежание сокрытия регрессий или отключения проверок.\n');

    if (modifiedTests.length > 0) {
        console.error('Измененные файлы тестов:');
        modifiedTests.forEach(testFile => console.error(`  ❌ ${testFile}`));
    }

    if (modifiedHarness.length > 0) {
        console.error('\nИзмененные компоненты защитного харнесса:');
        modifiedHarness.forEach(harnessFile => console.error(`  🛡️ ${harnessFile}`));
    }

    console.error('\nЕсли вы разработчик и намеренно обновляете контракты, тесты или харнесс:');
    console.error('  👉 Передайте флаг: ALLOW_TEST_MUTATION=true git commit ...');
    console.error('  👉 Или: export ALLOW_TEST_MUTATION=true\n');
    console.error('='.repeat(68) + '\n');

    process.exit(1);
}

verifyHarnessIntegrity();
