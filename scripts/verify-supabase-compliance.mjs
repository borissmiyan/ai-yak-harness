#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * 🔒 Supabase Compliance & Security Shield (Tier-2 AI Harness Gate)
 *
 * Предотвращает появление уязвимостей и антипаттернов производительности
 * в DDL-миграциях Supabase:
 * 1. Проверяет включение RLS на всех создаваемых таблицах.
 * 2. Требует явный 'SET search_path = public' для функций с SECURITY DEFINER.
 * 3. Блокирует выдачу прав на выполнение анонимным пользователям (TO anon / public)
 *    для внутренних и административных функций.
 * 4. Контролирует оптимизацию RLS InitPlan: вызовы auth.uid() обязаны быть обернуты
 *    в (select auth.uid()) во избежание N-кратного вычисления на каждую строку.
 *
 * Для намеренных исключений:
 * ALLOW_SCHEMA_MUTATION=true git commit ...
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Белый список функций, которые ДОЛЖНЫ быть доступны анонимным клиентам
const ANON_RPC_WHITELIST = new Set([
    'get_public_report_for_signing',
    'sign_report_by_customer'
]);

function runCommand(cmd) {
    try {
        return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    } catch {
        return '';
    }
}

/**
 * Очищает SQL от комментариев для точного синтаксического анализа
 */
function cleanSql(sql) {
    return sql
        .replace(/--.*$/gm, '') // single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, ''); // multi-line comments
}

/**
 * 1. Проверка обязательного включения RLS для новых таблиц
 */
export function validateMigrationRls(sqlContent, filePath = '') {
    const violations = [];
    const cleaned = cleanSql(sqlContent);

    // Поиск создаваемых таблиц: CREATE TABLE [IF NOT EXISTS] [public.]<name>
    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(?:public|"public")\.)?(?:["']?(\w+)["']?)/gi;
    const createdTables = new Set();
    let match;
    while ((match = createTableRegex.exec(cleaned)) !== null) {
        if (match[1]) {
            createdTables.add(match[1].toLowerCase());
        }
    }

    // Поиск включения RLS: ALTER TABLE [public.]<name> ENABLE ROW LEVEL SECURITY
    const enableRlsRegex = /ALTER\s+TABLE\s+(?:(?:public|"public")\.)?(?:["']?(\w+)["']?)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;
    const rlsEnabledTables = new Set();
    while ((match = enableRlsRegex.exec(cleaned)) !== null) {
        if (match[1]) {
            rlsEnabledTables.add(match[1].toLowerCase());
        }
    }

    for (const table of createdTables) {
        if (!rlsEnabledTables.has(table)) {
            violations.push({
                file: filePath,
                table,
                rule: 'RLS_MISSING',
                message: `Таблица '${table}' создана без команды: ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`
            });
        }
    }

    return violations;
}

/**
 * 2. Проверка SET search_path для SECURITY DEFINER функций
 */
export function validateSearchPath(sqlContent, filePath = '') {
    const violations = [];
    const cleaned = cleanSql(sqlContent);

    // Разбиваем на блоки создания функций
    const funcRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:(?:public|"public")\.)?(?:["']?(\w+)["']?)\s*\(([\s\S]*?)\)[\s\S]*?(?:AS\s+\$\$|AS\s+')[^]*?(?:\$\$;|';)/gi;
    let match;
    while ((match = funcRegex.exec(cleaned)) !== null) {
        const funcName = match[1];
        const funcBlock = match[0];

        // Проверяем, является ли функция SECURITY DEFINER
        if (/\bSECURITY\s+DEFINER\b/i.test(funcBlock)) {
            // Проверяем наличие SET search_path
            const hasSearchPath = /\bSET\s+search_path\s*=/i.test(funcBlock);
            if (!hasSearchPath) {
                violations.push({
                    file: filePath,
                    functionName: funcName,
                    rule: 'SEARCH_PATH_MUTABLE',
                    message: `Функция '${funcName}' объявлена как SECURITY DEFINER, но не содержит 'SET search_path = public, pg_temp;'. Это создает уязвимость Search Path Hijacking.`
                });
            }
        }
    }

    return violations;
}

/**
 * 3. Проверка утечки прав на выполнение внутренних RPC анонимам
 */
export function validateAnonExecPrivileges(sqlContent, filePath = '') {
    const violations = [];
    const cleaned = cleanSql(sqlContent);

    // GRANT EXECUTE ON FUNCTION [public.]<func> TO anon / public
    const grantRegex = /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+(?:(?:public|"public")\.)?(?:["']?(\w+)["']?)[^;]*\s+TO\s+(?:anon|public)\b/gi;
    let match;
    while ((match = grantRegex.exec(cleaned)) !== null) {
        const funcName = match[1];
        if (funcName && !ANON_RPC_WHITELIST.has(funcName.toLowerCase())) {
            violations.push({
                file: filePath,
                functionName: funcName,
                rule: 'ANON_EXECUTE_FORBIDDEN',
                message: `Функция '${funcName}' выдает права EXECUTE роли 'anon' или 'public'. Если функция публичная (например, онлайн-подписание), добавьте ее в whitelist.`
            });
        }
    }

    return violations;
}

/**
 * 4. Проверка производительности RLS InitPlan: (select auth.uid())
 */
export function validateRlsPerformance(sqlContent, filePath = '') {
    const violations = [];
    const cleaned = cleanSql(sqlContent);

    // Ищем определение политик
    const policyRegex = /CREATE\s+POLICY\s+["']?([^"']+)["']?[\s\S]*?(?:USING|WITH\s+CHECK)\s*\(([\s\S]*?)\)\s*;/gi;
    let match;
    while ((match = policyRegex.exec(cleaned)) !== null) {
        const policyName = match[1];
        const expr = match[2];

        // Ищем bare auth.uid() без предшествующего select
        // Пример ошибки: user_id = auth.uid()
        // Пример нормы:  user_id = (select auth.uid())
        const bareAuthRegex = /(?<!\(\s*select\s+)auth\.(?:uid|jwt)\(\)/gi;
        if (bareAuthRegex.test(expr)) {
            violations.push({
                file: filePath,
                policyName,
                rule: 'RLS_INITPLAN_OPTIMIZATION',
                message: `Политика '${policyName}' использует 'auth.uid()' без обертки '(select auth.uid())'. Это приводит к повторному вычислению функции для каждой строки таблицы.`
            });
        }
    }

    return violations;
}

/**
 * Основная функция проверки соответствия Supabase
 */
export function verifySupabaseCompliance(options = {}) {
    console.log('\n🔒 [Supabase Compliance Gate] Проверка безопасности и производительности SQL миграций...');

    if (process.env.ALLOW_SCHEMA_MUTATION === 'true' || process.env.ALLOW_TEST_MUTATION === 'true') {
        console.log('🛡️ [Supabase Compliance Gate] Проверка пропущена флагом (ALLOW_SCHEMA_MUTATION=true).');
        return true;
    }

    const checkAll = options.all || process.argv.includes('--all');
    let sqlFiles = [];

    if (checkAll) {
        const migDir = path.join(ROOT_DIR, 'supabase', 'migrations');
        if (fs.existsSync(migDir)) {
            sqlFiles = fs.readdirSync(migDir)
                .filter(f => f.endsWith('.sql'))
                .map(f => path.join('supabase', 'migrations', f));
        }
    } else {
        const diffOutput = runCommand('git diff --cached --name-only --diff-filter=ACM') ||
                           runCommand('git diff --name-only --diff-filter=ACM');
        const changedFiles = diffOutput ? diffOutput.split('\n').filter(Boolean) : [];
        sqlFiles = changedFiles.filter(f => f.startsWith('supabase/migrations/') && f.endsWith('.sql'));
    }

    if (sqlFiles.length === 0) {
        console.log('✅ [Supabase Compliance Gate] Нет измененных SQL миграций для проверки.');
        return true;
    }

    const allViolations = [];

    for (const sqlFile of sqlFiles) {
        const fullPath = path.resolve(ROOT_DIR, sqlFile);
        if (!fs.existsSync(fullPath)) continue;

        const content = fs.readFileSync(fullPath, 'utf8');
        allViolations.push(...validateMigrationRls(content, sqlFile));
        allViolations.push(...validateSearchPath(content, sqlFile));
        allViolations.push(...validateAnonExecPrivileges(content, sqlFile));
        allViolations.push(...validateRlsPerformance(content, sqlFile));
    }

    if (allViolations.length > 0) {
        console.error('\n' + '='.repeat(70));
        console.error('🛑 [SUPABASE COMPLIANCE GATE] ОБНАРУЖЕНЫ НАРУШЕНИЯ БЕЗОПАСНОСТИ / RLS!');
        console.error('='.repeat(70));
        for (const v of allViolations) {
            console.error(`  ❌ Файл:    ${v.file}`);
            console.error(`     Правило: ${v.rule}`);
            console.error(`     Детали:  ${v.message}\n`);
        }
        console.error('Исправьте указанные ошибки в SQL миграциях перед коммитом.');
        console.error('Для аварийного пропуска: ALLOW_SCHEMA_MUTATION=true git commit ...\n');
        console.error('='.repeat(70) + '\n');
        process.exit(1);
    }

    console.log('✅ [Supabase Compliance Gate] Все миграции соответствуют стандартам безопасности и RLS.\n');
    return true;
}

// Запуск CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    verifySupabaseCompliance();
}
