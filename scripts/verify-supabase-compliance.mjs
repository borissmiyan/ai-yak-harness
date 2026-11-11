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
 * Извлекает все объявленные функциональные индексы из SQL
 */
export function extractFunctionalIndexes(sql) {
    const indexes = new Set();
    const cleaned = cleanSql(sql);
    const onRegex = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:["']?\w+["']?\s+)?ON\s+(?:(?:public|"public")\.)?([a-zA-Z0-9_]+)(?:\s+USING\s+[a-zA-Z0-9_]+)?\s*\(/gi;
    let match;
    while ((match = onRegex.exec(cleaned)) !== null) {
        const table = match[1].toLowerCase();
        const startIndex = onRegex.lastIndex;
        let depth = 1;
        let idx = startIndex;
        while (idx < cleaned.length && depth > 0) {
            if (cleaned[idx] === '(') depth++;
            else if (cleaned[idx] === ')') depth--;
            idx++;
        }
        if (depth === 0) {
            const rawExpr = cleaned.substring(startIndex, idx - 1).trim();
            if (rawExpr.includes('(')) {
                const normalized = rawExpr.toLowerCase().replace(/\s+/g, '');
                indexes.add(`${table}:${normalized}`);
                indexes.add(normalized);
                const stripped = normalized.replace(/coalesce\(([^,]+),[^)]*\)/g, '$1');
                indexes.add(`${table}:${stripped}`);
                indexes.add(stripped);
            }
        }
    }
    return indexes;
}

/**
 * 5. Проверка наличия функциональных индексов для выражений в WHERE (UPPER, LOWER, TRIM)
 * Предотвращает Sequential Scan по таблицам и таймауты PostgREST (57014).
 */
export function validateFunctionalIndexes(sqlContent, filePath = '', existingSchema = '') {
    const violations = [];
    if (sqlContent.includes('@supabase-compliance-ignore: functional-index') || 
        sqlContent.includes('@supabase-compliance-ignore: all')) {
        return violations;
    }

    const declaredIndexes = extractFunctionalIndexes(sqlContent + '\n' + existingSchema);
    const cleaned = cleanSql(sqlContent);

    const tableWhereRegex = /(?:FROM|UPDATE|DELETE\s+FROM)\s+(?:(?:public|"public")\.)?([a-zA-Z0-9_]+)(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?[^;]*?\bWHERE\b([\s\S]*?)(?:;|\bLIMIT\b|\bGROUP\b|\bORDER\b|\bRETURN\b|\$\$|\bLOOP\b)/gi;
    let match;
    while ((match = tableWhereRegex.exec(cleaned)) !== null) {
        const tableName = match[1].toLowerCase();
        const tableAlias = match[2]?.toLowerCase();
        const whereClause = match[3];

        if (whereClause.includes('@supabase-compliance-ignore: functional-index')) {
            continue;
        }

        const funcCallRegex = /\b(UPPER|LOWER)\s*\(/gi;
        let funcMatch;
        while ((funcMatch = funcCallRegex.exec(whereClause)) !== null) {
            const funcName = funcMatch[1].toUpperCase();
            const startIndex = funcCallRegex.lastIndex;
            let depth = 1;
            let idx = startIndex;
            while (idx < whereClause.length && depth > 0) {
                if (whereClause[idx] === '(') depth++;
                else if (whereClause[idx] === ')') depth--;
                idx++;
            }
            if (depth === 0) {
                const innerArgs = whereClause.substring(startIndex, idx - 1).trim();
                const lowerInner = innerArgs.toLowerCase();

                if (
                    !innerArgs ||
                    innerArgs.startsWith("'") ||
                    innerArgs.startsWith('"') ||
                    /^\d+$/.test(innerArgs) ||
                    lowerInner.startsWith('v_') ||
                    lowerInner.startsWith('p_') ||
                    lowerInner.startsWith('new.') ||
                    lowerInner.startsWith('old.') ||
                    lowerInner.startsWith('coalesce(v_') ||
                    lowerInner.startsWith('coalesce(p_') ||
                    lowerInner.startsWith('trim(v_') ||
                    lowerInner.startsWith('trim(p_')
                ) {
                    continue;
                }

                const fullExpr = `${funcName}(${innerArgs})`;
                let cleanInner = innerArgs;
                if (tableAlias) {
                    cleanInner = cleanInner.replace(new RegExp(`\\b${tableAlias}\\.`, 'gi'), '');
                }
                cleanInner = cleanInner.replace(new RegExp(`\\b${tableName}\\.`, 'gi'), '');
                const normalizedExpr = `${funcName}(${cleanInner})`.toLowerCase().replace(/\s+/g, '');
                const tableKey = `${tableName}:${normalizedExpr}`;
                const strippedCoalesce = normalizedExpr.replace(/coalesce\(([^,]+),[^)]*\)/g, '$1');
                const strippedKey = `${tableName}:${strippedCoalesce}`;

                const hasIndex = declaredIndexes.has(tableKey) || 
                                 declaredIndexes.has(normalizedExpr) ||
                                 declaredIndexes.has(strippedKey) ||
                                 declaredIndexes.has(strippedCoalesce);

                if (!hasIndex) {
                    violations.push({
                        file: filePath,
                        table: tableName,
                        expression: fullExpr,
                        rule: 'EXPRESSION_INDEX_MISSING',
                        message: `Запрос к таблице '${tableName}' использует выражение '${fullExpr}' в блоке WHERE без функционального индекса. Это вызывает полный перебор таблицы (Sequential Scan) и таймауты (error 57014) на больших объемах данных. Создайте функциональный индекс: CREATE INDEX idx_${tableName}_expr ON ${tableName} (${fullExpr});`
                    });
                }
            }
        }
    }

    return violations;
}

/**
 * 6. Проверка запросов внутри циклов PL/pgSQL функций (N+1 Loop Query Detection)
 * Предотвращает зависания при пакетной обработке (импорте Excel и синхронизации).
 */
export function validateBatchLoops(sqlContent, filePath = '') {
    const violations = [];
    if (sqlContent.includes('@supabase-compliance-ignore: loop-query') || sqlContent.includes('@supabase-compliance-ignore: all')) {
        return violations;
    }

    const cleaned = cleanSql(sqlContent);
    const loopRegex = /\bFOR\s+([a-zA-Z0-9_]+)\s+IN\s+[^;]+?LOOP([\s\S]*?)END\s+LOOP;/gi;
    let match;
    while ((match = loopRegex.exec(cleaned)) !== null) {
        const loopVar = match[1];
        const loopBody = match[2];

        if (loopBody.includes('@supabase-compliance-ignore: loop-query')) {
            continue;
        }

        const selectRegex = /SELECT\s+[\s\S]*?\s+FROM\s+(?:(?:public|"public")\.)?(parcels|clients|orders|transactions)\b([\s\S]*?)(?:;|\bLOOP\b)/gi;
        let selectMatch;
        while ((selectMatch = selectRegex.exec(loopBody)) !== null) {
            const table = selectMatch[1].toLowerCase();
            const restOfQuery = selectMatch[2];

            const hasLimit1 = /\bLIMIT\s+1\b/i.test(restOfQuery);
            if (!hasLimit1) {
                violations.push({
                    file: filePath,
                    table,
                    loopVariable: loopVar,
                    rule: 'LOOP_N_PLUS_ONE_UNBOUNDED',
                    message: `Таблица '${table}' опрашивается внутри цикла FOR ${loopVar} IN ... LOOP без 'LIMIT 1'. Неограниченные выборки внутри циклов по объемным таблицам приводят к N+1 нагрузке и таймауту (57014). Добавьте LIMIT 1 или переведите логику на массовый JOIN/ANY.`
                });
            }
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
    const migDir = path.join(ROOT_DIR, 'supabase', 'migrations');
    let fullSchemaSql = '';
    if (fs.existsSync(migDir)) {
        const allFiles = fs.readdirSync(migDir).filter(f => f.endsWith('.sql'));
        fullSchemaSql = allFiles.map(f => fs.readFileSync(path.join(migDir, f), 'utf8')).join('\n');
    }

    for (const sqlFile of sqlFiles) {
        const fullPath = path.resolve(ROOT_DIR, sqlFile);
        if (!fs.existsSync(fullPath)) continue;

        const content = fs.readFileSync(fullPath, 'utf8');
        allViolations.push(...validateMigrationRls(content, sqlFile));
        allViolations.push(...validateSearchPath(content, sqlFile));
        allViolations.push(...validateAnonExecPrivileges(content, sqlFile));
        allViolations.push(...validateRlsPerformance(content, sqlFile));
        allViolations.push(...validateFunctionalIndexes(content, sqlFile, fullSchemaSql));
        allViolations.push(...validateBatchLoops(content, sqlFile));
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
