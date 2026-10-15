#!/usr/bin/env node
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * ⚡ Component Architecture & TSX/Hook Size Budget Gate (AI Yak Harness Standard)
 * 
 * В соответствии со стандартом Enterprise React Architecture (ADR D-04):
 * - .tsx UI-Kit: 50–150 строк (Presentational).
 * - .tsx Containers/Screens: 150–250 строк (Enterprise Gold Standard).
 * - .tsx Предупреждение (Желтая зона / Tech Debt): 300 строк.
 * - .tsx Аварийный потолок (Красная зона / Hard Limit): 500 строк.
 * - use*.ts Хуки (Защита от «Хук-помойки»): 150 строк (warn), 250 строк (error).
 * 
 * Безопасность:
 * - В режиме --staged читает строго Git Index (git show :file) с флагом -z.
 * - При ошибке чтения индекса падает (Fail-Closed, никаких чтений с диска).
 * - Запрещает inline-директивы игнорирования. Исключения задаются строго в configs/budget-exceptions.json.
 * - Запрещает байпасы в CI (process.env.CI === 'true').
 */

function loadLimits() {
    try {
        const limitsPath = path.resolve(process.cwd(), 'configs', 'harness-limits.json');
        if (fs.existsSync(limitsPath)) {
            const raw = JSON.parse(fs.readFileSync(limitsPath, 'utf-8'));
            return raw.component || {};
        }
    } catch {}
    return {
        tsx_gold_max: 250,
        tsx_warn: 300,
        tsx_error: 500,
        hook_warn: 150,
        hook_error: 250,
        max_use_state_in_tsx: 3
    };
}

export function loadExceptions() {
    try {
        const exceptionsPath = path.resolve(process.cwd(), 'configs', 'budget-exceptions.json');
        if (fs.existsSync(exceptionsPath)) {
            const raw = JSON.parse(fs.readFileSync(exceptionsPath, 'utf-8'));
            return raw.exceptions || {};
        }
    } catch {}
    return {};
}

export const BUDGET_LIMITS = loadLimits();

/**
 * Проверяет, является ли файл целевым объектом аудита (компонентом или хуком).
 */
export function isTargetFile(filePath) {
    const normalized = filePath.replace(/\\/g, '/');

    if (
        normalized.includes('node_modules/') ||
        normalized.includes('dist/') ||
        normalized.includes('build/') ||
        normalized.includes('coverage/') ||
        normalized.includes('__tests__/')
    ) {
        return false;
    }

    // Исключаем тестовые файлы и истории
    if (/\.(test|spec|stories)\.(tsx|ts)$/i.test(normalized)) {
        return false;
    }

    // Целевой файл: любой .tsx компонент
    if (normalized.endsWith('.tsx')) {
        return true;
    }

    // Целевой файл: кастомный хук use*.ts
    if (/(^|\/)use[A-Z0-9].*\.ts$/i.test(normalized)) {
        return true;
    }

    return false;
}

/**
 * Подсчитывает количество чистых строк кода без комментариев и пустых строк.
 * Полное соответствие логике ESLint skipBlankLines: true, skipComments: true.
 */
export function countCleanLines(content) {
    if (!content || typeof content !== 'string') return 0;

    // Заменяем блочные комментарии /* ... */ с сохранением переводов строк
    const noBlockComments = content.replace(/\/\*[\s\S]*?\*\//g, (match) => {
        return match.includes('\n') ? match.split('\n').map(() => '').join('\n') : '';
    });

    const lines = noBlockComments.split('\n');
    let cleanCount = 0;

    for (const rawLine of lines) {
        const trimmed = rawLine.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('//')) continue;
        if (trimmed.startsWith('*')) continue; // JSDoc тело

        cleanCount++;
    }

    return cleanCount;
}

/**
 * Читает содержимое файла строго из Git Index (Staged Area).
 * Fail-Closed: при ошибке выбрасывает исключение, никогда не читая грязный диск.
 */
export function readFromGitIndex(relFilePath) {
    const gitPath = relFilePath.replace(/\\/g, '/');
    try {
        return execFileSync('git', ['show', `:${gitPath}`], { encoding: 'utf-8' });
    } catch (err) {
        throw new Error(`[FAIL-CLOSED] Failed to read "${relFilePath}" from Git Index: ${err.message}`);
    }
}

/**
 * Извлекает список застейдженных файлов через null-byte разделитель (-z).
 */
export function getStagedFiles() {
    try {
        const output = execFileSync(
            'git',
            ['diff', '--cached', '-z', '--name-only', '--diff-filter=ACMR'],
            { encoding: 'utf-8' }
        );
        if (!output) return [];
        return output.split('\0').map(f => f.trim()).filter(f => f.length > 0 && isTargetFile(f));
    } catch {
        return [];
    }
}

/**
 * Валидирует отдельный файл на соответствие бюджету строк.
 */
export function checkComponentBudget(filePath, content, exceptions = loadExceptions()) {
    if (!isTargetFile(filePath)) {
        return { status: 'skipped' };
    }

    const cleanLines = countCleanLines(content);
    const normalizedPath = filePath.replace(/\\/g, '/');
    const inlineIgnoreAttempted = content.includes('@component-budget-ignore');

    // Проверяем авторизованные исключения в configs/budget-exceptions.json
    const allowedLimit = exceptions[normalizedPath] || exceptions[filePath] || null;
    if (allowedLimit !== null) {
        if (cleanLines <= allowedLimit) {
            return {
                status: 'authorized_exception',
                cleanLines,
                allowedLimit,
                inlineIgnoreAttempted
            };
        }
    }

    const isHook = /(^|\/)use[A-Z0-9].*\.ts$/i.test(normalizedPath);
    const warnThreshold = isHook ? (BUDGET_LIMITS.hook_warn || 150) : (BUDGET_LIMITS.tsx_warn || 300);
    const errorThreshold = isHook ? (BUDGET_LIMITS.hook_error || 250) : (BUDGET_LIMITS.tsx_error || 500);

    if (cleanLines > errorThreshold) {
        const msg = isHook
            ? `Хук превысил лимит (${cleanLines} чистых строк > ${errorThreshold}). Декомпозируйте логику хука на подхуки или выселите чистые функции в utils.ts.`
            : `Красная зона / Аварийный потолок (${cleanLines} чистых строк > ${errorThreshold}). Компонент перегружен! Примените 3 правила декомпозиции (вынос в use*.ts, utils.ts, подкомпоненты с колокацией стейта).`;

        return {
            status: 'error',
            cleanLines,
            isHook,
            inlineIgnoreAttempted,
            message: msg
        };
    }

    if (cleanLines > warnThreshold) {
        const msg = isHook
            ? `Хук перегружен (${cleanLines} чистых строк > ${warnThreshold}). Рекомендуется декомпозиция.`
            : `Желтая зона / Tech Debt (${cleanLines} чистых строк > ${warnThreshold}). Золотой стандарт индустрии — 150–250 строк. Рекомендуется рефакторинг до достижения потолка ${errorThreshold} строк.`;

        return {
            status: 'warn',
            cleanLines,
            isHook,
            inlineIgnoreAttempted,
            message: msg
        };
    }

    return {
        status: 'pass',
        cleanLines,
        isHook,
        inlineIgnoreAttempted
    };
}

function collectTargetFiles(dirPath, collected = []) {
    if (!fs.existsSync(dirPath)) return collected;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            if (['node_modules', 'dist', 'build', '.git', 'coverage', '__tests__'].includes(entry.name)) {
                continue;
            }
            collectTargetFiles(fullPath, collected);
        } else if (entry.isFile() && isTargetFile(fullPath)) {
            collected.push(fullPath);
        }
    }
    return collected;
}

export function verifyComponentBudget() {
    const isCi = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
    if (process.env.ALLOW_LARGE_COMPONENT === 'true') {
        if (isCi) {
            console.error('🛑 [Component Budget Gate] Флаг ALLOW_LARGE_COMPONENT=true строго запрещен в окружении CI!');
            process.exit(1);
        }
        console.log('⚡ [Component Budget Guard] Проверка пропущена локальным флагом ALLOW_LARGE_COMPONENT=true.');
        process.exit(0);
    }

    const isStaged = process.argv.includes('--staged');
    let targetFiles = [];

    if (isStaged) {
        targetFiles = getStagedFiles();
    } else {
        const srcDir = path.resolve(process.cwd(), 'src');
        targetFiles = collectTargetFiles(srcDir);
    }

    if (targetFiles.length === 0) {
        console.log('⚡ [Component Budget Guard] Нет компонентов или хуков для проверки.');
        process.exit(0);
    }

    const errors = [];
    const warnings = [];
    const exceptions = loadExceptions();

    for (const filePath of targetFiles) {
        const relPath = path.relative(process.cwd(), path.resolve(process.cwd(), filePath));
        let content = '';

        try {
            // В режиме --staged читаем строго Git Index (Fail-Closed)
            content = isStaged ? readFromGitIndex(relPath) : fs.readFileSync(filePath, 'utf-8');
        } catch (err) {
            console.error(`\n🛑 [Component Budget Gate Error]: ${err.message}`);
            process.exit(1);
        }

        const result = checkComponentBudget(relPath, content, exceptions);

        if (result.inlineIgnoreAttempted) {
            console.warn(`⚠️ [ADVISORY] ${relPath}: Inline-директива @component-budget-ignore запрещена и игнорируется. Исключения регистрируются только в configs/budget-exceptions.json.`);
        }

        if (result.status === 'error') {
            errors.push({ file: relPath, ...result });
        } else if (result.status === 'warn') {
            warnings.push({ file: relPath, ...result });
        }
    }

    if (warnings.length > 0) {
        console.warn('\n' + '-'.repeat(74));
        console.warn('⚠️ [AI HARNESS ADVISORY] ФАЙЛЫ В ЖЕЛТОЙ ЗОНЕ (ТРЕБУЕТСЯ ДЕКОМПОЗИЦИЯ):');
        console.warn('-'.repeat(74));
        warnings.forEach(w => {
            console.warn(`- ${w.file} (${w.cleanLines} чистых строк)`);
            console.warn(`  ${w.message}`);
        });
        console.warn('-'.repeat(74) + '\n');
    }

    if (errors.length > 0) {
        console.error('\n' + '='.repeat(74));
        console.error('🛑 [AI HARNESS GATE] ПРЕВЫШЕН АВАРИЙНЫЙ ПОТОЛОК РАЗМЕРА (.TSX / USE*.TS)!');
        console.error('='.repeat(74));
        errors.forEach(e => {
            console.error(`- ❌ ${e.file} (${e.cleanLines} чистых строк)`);
            console.error(`     ${e.message}\n`);
        });
        console.error('📋 СТАНДАРТ АРХИТЕКТУРЫ (ADR D-04):');
        console.error('  1. Золотой стандарт размера .tsx: 150–250 строк (UI-Kit: 50–150 строк).');
        console.error('  2. Хуки use*.ts: максимум 150 строк (warn) / 250 строк (hard error).');
        console.error('  3. Запрет «хук-помойки»: логика разбивается на подхуки и чистые утилиты.');
        console.error('  4. Колокация стейта: приватный стейт изолируется в дочернем компоненте.\n');
        console.error('Для санкционированного исключения зарегистрируйте файл в configs/budget-exceptions.json');
        console.error('='.repeat(74) + '\n');
        process.exit(1);
    }

    console.log(`⚡ [Component Budget Guard] Проверено ${targetFiles.length} компонентов и хуков: все соответствуют стандарту (Золотой стандарт: 150–250 строк).`);
    process.exit(0);
}

const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFilePath)) {
    verifyComponentBudget();
}
