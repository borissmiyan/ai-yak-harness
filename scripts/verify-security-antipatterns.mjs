#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * 🛡️ Security Anti-Pattern & IDOR Pre-Commit Gate (Эшелон 3 AI-Харнесса)
 * 
 * Предотвращает коммит типовых архитектурных уязвимостей безопасности:
 * 1. Self-Privilege Escalation в RLS политиках для профилей и пользователей.
 * 2. Public Anon IDOR в SECURITY DEFINER RPC-функциях на базе предсказуемых числовых ID.
 * 3. Формирование публичных ссылок подписания на базе числовых ID в UI.
 * 
 * Исключения помечаются директивой:
 * -- @security-gate-ignore: <причина> (в SQL)
 * // @security-gate-ignore: <причина> (в TS/TSX)
 */

export function checkRlsPrivilegeEscalation(content, filePath = '') {
    if (content.includes('@security-gate-ignore')) return [];
    const violations = [];

    const hasUpdatePolicyOnProfiles = /CREATE\s+POLICY\s+["']?[^"']+["']?\s+ON\s+(?:public\.)?profiles\s+FOR\s+UPDATE/i.test(content);
    const hasAuthUidMatch = /auth\.uid\(\)\s*=\s*id/i.test(content);

    if (hasUpdatePolicyOnProfiles && hasAuthUidMatch) {
        // Проверяем, есть ли защитный триггер BEFORE UPDATE
        const hasProtectTrigger = /CREATE\s+TRIGGER\s+\w+\s+BEFORE\s+UPDATE\s+ON\s+(?:public\.)?profiles/i.test(content);
        if (!hasProtectTrigger) {
            violations.push({
                file: filePath,
                message: 'Privilege escalation: UPDATE policy on profiles allows self-updates without a BEFORE UPDATE trigger protecting role/is_approved fields.'
            });
        }
    }

    return violations;
}

export function checkPublicAnonIdor(content, filePath = '') {
    if (content.includes('@security-gate-ignore')) return [];
    const violations = [];

    const isSecurityDefiner = /SECURITY\s+DEFINER/i.test(content);
    const hasAnonGrant = /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+[^;]+TO\s+[^;]*anon/i.test(content);

    if (isSecurityDefiner && hasAnonGrant) {
        // Проверяем наличие обращения к id через числовой парсинг
        const queriesByNumericId = /WHERE\s+(?:\w+\.)?id\s*=\s*(?:v_id|v_clean_id::bigint|p_report_id::bigint|p_id)/i.test(content) ||
                                  /regexp_replace\([^,]+,\s*['"]\^.*\\\d\+\$['"]/i.test(content);
        const hasSigningTokenQuery = /WHERE\s+(?:\w+\.)?signing_token\s*=/i.test(content);

        if (queriesByNumericId && !hasSigningTokenQuery) {
            violations.push({
                file: filePath,
                message: 'Public Anon IDOR vulnerability: RPC with anon execution permission queries primary key by sequential ID instead of unguessable UUID/token.'
            });
        }
    }

    return violations;
}

export function checkFrontendIdorLeaks(content, filePath = '') {
    if (content.includes('@security-gate-ignore')) return [];
    const violations = [];

    const hasSequentialSignUrl = /\/sign\/(?:protokol-|\$\{[^}]*\.id\})/i.test(content);
    if (hasSequentialSignUrl) {
        violations.push({
            file: filePath,
            message: 'Sequential ID in public signing URL: use unguessable signing_token instead.'
        });
    }

    return violations;
}

export function checkHardcodedSecretFallbacks(content, filePath = '') {
    if (content.includes('@security-gate-ignore')) return [];
    const violations = [];

    // Detect patterns like Deno.env.get(...) || 'raw_token', process.env.X || 'raw_token', or import.meta.env.X || 'raw_token'
    const fallbackRegex = /(?:Deno\.env\.get\([^)]*\)|process\.env(?:\.[a-zA-Z0-9_]+|\[['"][^'"]+['"]\])|import\.meta\.env(?:\.[a-zA-Z0-9_]+|\[['"][^'"]+['"]\]))\s*\|\|\s*['"]([a-zA-Z0-9_\-\.]{20,})['"]/g;
    let match;
    while ((match = fallbackRegex.exec(content)) !== null) {
        const candidate = match[1];
        // Ignore benign URLs, email addresses, and filenames
        if (candidate.startsWith('http://') || candidate.startsWith('https://') || candidate.includes('@') || candidate.includes('/')) {
            continue;
        }
        violations.push({
            file: filePath,
            message: `Hardcoded credential fallback detected in environment access (${candidate.slice(0, 6)}...): remove raw token and require environment configuration.`
        });
    }

    return violations;
}

export function checkClientSecretExposure(content, filePath = '') {
    if (content.includes('@security-gate-ignore')) return [];
    const violations = [];

    const hasClientSecret = /import\.meta\.env\.VITE_[A-Z0-9_]*SECRET[A-Z0-9_]*/i.test(content);
    if (hasClientSecret) {
        violations.push({
            file: filePath,
            message: 'Client bundle secret exposure: Secret key accessed via VITE_ prefix compiles into public browser bundle. Use server-side proxy or presigned URLs.'
        });
    }

    return violations;
}

function getAllFiles(dir, extensions) {
    const files = [];
    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
                files.push(...getAllFiles(fullPath, extensions));
            }
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
            files.push(fullPath);
        }
    }
    return files;
}

export function verifySecurityAntipatterns() {
    if (process.env.ALLOW_SECURITY_VIOLATIONS === 'true') {
        console.log('🛡️ [Security Anti-Pattern Gate] Проверка пропущена флагом ALLOW_SECURITY_VIOLATIONS=true.');
        return;
    }

    const violations = [];

    // 1. Проверка SQL-миграций
    const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
    const sqlFiles = getAllFiles(migrationsDir, ['.sql']);

    // Проверяем последние миграции или новые файлы
    for (const filePath of sqlFiles) {
        // Пропускаем исторические миграции до 2026-10-13, если они не модифицируются
        const content = fs.readFileSync(filePath, 'utf-8');
        const relPath = path.relative(process.cwd(), filePath);

        // Исключаем старые миграции, если в них явно не добавляется новый код
        const isLegacyMigration = path.basename(filePath) < '20261013';
        if (!isLegacyMigration) {
            violations.push(...checkRlsPrivilegeEscalation(content, relPath));
            violations.push(...checkPublicAnonIdor(content, relPath));
        }
    }

    // 2. Проверка Edge Functions на захардкоженные секреты
    const functionsDir = path.resolve(process.cwd(), 'supabase/functions');
    const functionFiles = getAllFiles(functionsDir, ['.ts']);
    for (const filePath of functionFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const relPath = path.relative(process.cwd(), filePath);
        violations.push(...checkHardcodedSecretFallbacks(content, relPath));
    }

    // 3. Проверка фронтенд кода
    const srcDir = path.resolve(process.cwd(), 'src');
    const tsxFiles = getAllFiles(srcDir, ['.tsx', '.ts']);
    for (const filePath of tsxFiles) {
        if (filePath.includes('__tests__') || filePath.includes('.test.') || filePath.includes('.spec.')) continue;
        const content = fs.readFileSync(filePath, 'utf-8');
        const relPath = path.relative(process.cwd(), filePath);
        violations.push(...checkFrontendIdorLeaks(content, relPath));
        violations.push(...checkClientSecretExposure(content, relPath));
        violations.push(...checkHardcodedSecretFallbacks(content, relPath));
    }

    if (violations.length > 0) {
        console.error('\n' + '='.repeat(74));
        console.error('🛑 [AI HARNESS GATE] ОБНАРУЖЕНЫ КРИТИЧЕСКИЕ АНТИПАТТЕРНЫ БЕЗОПАСНОСТИ:');
        console.error('='.repeat(74));
        violations.forEach(v => {
            console.error(`- ${v.file}`);
            console.error(`  ${v.message}`);
        });
        console.error('='.repeat(74));
        console.error('Устраните уязвимость (добавьте триггер/UUID токен) или, если поведение');
        console.error('намеренное, добавьте комментарий: -- @security-gate-ignore: <причина>\n');
        process.exit(1);
    }

    console.log(`🛡️ [Security Anti-Pattern Gate] Проверено ${sqlFiles.length} миграций и ${tsxFiles.length} исходников: уязвимостей RLS и IDOR не обнаружено.`);
}

// Запуск напрямую из CLI
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
    verifySecurityAntipatterns();
}
