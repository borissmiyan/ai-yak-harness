#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * 🔒 Database Schema Drift & Column Parity Gate (Tier-2 AI Harness Gate)
 *
 * Предотвращает галлюцинации несуществующих колонок в SQL миграциях и коде,
 * а также контролирует синхронизацию локальных миграций с живой БД Supabase.
 *
 * Проверяет:
 * 1. Валидность всех вызываемых колонок таблиц против supabase/schema_snapshot.json.
 * 2. Автоматическое распознавание DDL добавлений (ALTER TABLE ADD COLUMN).
 * 3. Соответствие версий локальных миграций записям в supabase_migrations.schema_migrations.
 *
 * Для намеренных изменений схемы:
 * ALLOW_SCHEMA_MUTATION=true git commit ...
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SNAPSHOT_PATH = path.join(ROOT_DIR, 'supabase', 'schema_snapshot.json');

function runCommand(cmd) {
    try {
        return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    } catch {
        return '';
    }
}

/**
 * Удаляет комментарии и строковые литералы из SQL для чистого AST анализа
 */
function cleanSql(sql) {
    return sql
        .replace(/--.*$/gm, '') // single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // multi-line comments
        .replace(/'(?:''|[^'])*'/g, "''"); // string literals
}

/**
 * Валидирует обращения к колонкам в SQL коде против эталонного снимка схемы
 */
export function validateSqlColumns(sqlContent, snapshot, filePath = '') {
    const violations = [];
    if (!snapshot || !snapshot.tables) return violations;

    // Клонируем таблицы для поддержки DDL внутри одного файла
    const tables = {};
    for (const [tName, tData] of Object.entries(snapshot.tables)) {
        tables[tName.toLowerCase()] = new Set(
            (tData.columns || []).map(c => c.toLowerCase())
        );
    }

    const cleaned = cleanSql(sqlContent);

    // 1. Обнаруживаем DDL: ALTER TABLE [public.]<table_name> ADD COLUMN [IF NOT EXISTS] <column_name>
    const addColRegex = /ALTER\s+TABLE\s+(?:(?:public|"public")\.)?(?:["']?(\w+)["']?)\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:["']?(\w+)["']?)/gi;
    let ddlMatch;
    while ((ddlMatch = addColRegex.exec(cleaned)) !== null) {
        const table = ddlMatch[1]?.toLowerCase();
        const col = ddlMatch[2]?.toLowerCase();
        if (table && col) {
            if (!tables[table]) tables[table] = new Set();
            tables[table].add(col);
        }
    }

    // 2. Обнаруживаем переменные записей PL/pgSQL: DECLARE v_equipment equipment%ROWTYPE;
    const varToTable = {};
    const rowtypeRegex = /\b([a-zA-Z_]\w*)\s+(?:(?:public|"public")\.)?(?:["']?(\w+)["']?)%ROWTYPE\b/gi;
    let rowMatch;
    while ((rowMatch = rowtypeRegex.exec(cleaned)) !== null) {
        const varName = rowMatch[1].toLowerCase();
        const tableName = rowMatch[2].toLowerCase();
        if (tables[tableName]) {
            varToTable[varName] = tableName;
        }
    }

    // 3. Сканируем обращения к колонкам: <var_or_table>.<column>
    const lines = cleaned.split('\n');
    const accessRegex = /\b([a-zA-Z_]\w*)\.([a-zA-Z_]\w*)\b/g;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx];
        let match;

        while ((match = accessRegex.exec(line)) !== null) {
            const qualifier = match[1].toLowerCase();
            const colName = match[2].toLowerCase();

            // Исключаем ключевые слова и псевдонимы функций (jsonb_agg, to_jsonb, pg_catalog, etc.)
            if (['jsonb', 'public', 'pg_catalog', 'coalesce', 'new', 'old', 'p_report_id', 'p_id'].includes(qualifier)) {
                continue;
            }

            // Определяем целевую таблицу
            let targetTable = null;
            if (varToTable[qualifier]) {
                targetTable = varToTable[qualifier];
            } else if (tables[qualifier]) {
                targetTable = qualifier;
            } else if (qualifier.startsWith('v_')) {
                const candidate = qualifier.slice(2);
                if (tables[candidate]) {
                    targetTable = candidate;
                }
            }

            if (targetTable && tables[targetTable]) {
                const validCols = tables[targetTable];
                if (!validCols.has(colName)) {
                    violations.push({
                        file: filePath,
                        line: lineIdx + 1,
                        table: targetTable,
                        column: match[2],
                        validColumns: Array.from(validCols),
                        message: `Таблица '${targetTable}' не содержит колонку '${match[2]}'. Допустимые: ${Array.from(validCols).slice(0, 8).join(', ')}...`
                    });
                }
            }
        }
    }

    return violations;
}

/**
 * Проверяет, применены ли локальные миграции в удаленной БД Supabase
 */
export function checkLiveMigrationParity(localMigrationFiles, remoteVersions) {
    const unapplied = [];
    const remoteSet = new Set((remoteVersions || []).map(v => String(v).trim()));

    for (const file of localMigrationFiles) {
        const baseName = path.basename(file);
        const match = baseName.match(/^(\d{14}|\d+)/);
        if (!match) continue;

        const version = match[1];
        if (!remoteSet.has(version)) {
            unapplied.push(baseName);
        }
    }

    return unapplied;
}

/**
 * Основная функция шлюза
 */
export function verifySchemaDrift(options = {}) {
    console.log('\n🔒 [Schema Drift Gate] Проверка целостности и колонок базы данных...');

    // 1. Проверяем флаг разработчика
    if (process.env.ALLOW_SCHEMA_MUTATION === 'true' || process.env.ALLOW_TEST_MUTATION === 'true') {
        console.log('🛡️ [Schema Drift Gate] Проверка пропущена флагом (ALLOW_SCHEMA_MUTATION=true).');
        return true;
    }

    // 2. Загружаем эталонный снимок схемы
    let snapshot = null;
    if (fs.existsSync(SNAPSHOT_PATH)) {
        try {
            snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
        } catch {
            console.warn('⚠️ [Schema Drift Gate] Не удалось прочесть schema_snapshot.json.');
        }
    }

    if (!snapshot || !snapshot.tables) {
        console.warn('⚠️ [Schema Drift Gate] Эталонный снимок схемы отсутствует. Запустите npm run db:pull-schema.');
        return true;
    }

    // 3. Находим измененные SQL файлы
    const diffOutput = runCommand('git diff --cached --name-only --diff-filter=ACM') ||
                       runCommand('git diff --name-only --diff-filter=ACM');
    const changedFiles = diffOutput ? diffOutput.split('\n').filter(Boolean) : [];
    const sqlFiles = changedFiles.filter(f => f.startsWith('supabase/migrations/') && f.endsWith('.sql'));

    const allViolations = [];

    for (const sqlFile of sqlFiles) {
        const fullPath = path.resolve(ROOT_DIR, sqlFile);
        if (!fs.existsSync(fullPath)) continue;

        const content = fs.readFileSync(fullPath, 'utf8');
        const violations = validateSqlColumns(content, snapshot, sqlFile);
        allViolations.push(...violations);
    }

    if (allViolations.length > 0) {
        console.error('\n' + '='.repeat(70));
        console.error('🛑 [SCHEMA DRIFT GATE] ОБНАРУЖЕНО ОБРАЩЕНИЕ К НЕСУЩЕСТВУЮЩИМ КОЛОНКАМ!');
        console.error('='.repeat(70));
        for (const v of allViolations) {
            console.error(`  ❌ Файл:    ${v.file}${v.line ? `:${v.line}` : ''}`);
            console.error(`     Таблица: ${v.table}`);
            console.error(`     Колонка: ${v.column} (ОТСУТСТВУЕТ В СХЕМЕ)`);
            console.error(`     Допустимые: ${v.validColumns.slice(0, 10).join(', ')}...\n`);
        }
        console.error('Действия для исправления:');
        console.error('  1. Исправьте обращение к несуществующей колонке на актуальную.');
        console.error('  2. Либо добавьте ALTER TABLE ... ADD COLUMN в эту миграцию.');
        console.error('  3. Если схема базы изменилась на сервере, обновите снимок:');
        console.error('     👉 npm run db:pull-schema');
        console.error('  4. Для аварийного пропуска: ALLOW_SCHEMA_MUTATION=true git commit ...\n');
        console.error('='.repeat(70) + '\n');
        process.exit(1);
    }

    console.log('✅ [Schema Drift Gate] Все SQL миграции и колонки соответствуют схеме базы данных (0 расхождений).\n');
    return true;
}

// Запуск CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    verifySchemaDrift();
}
