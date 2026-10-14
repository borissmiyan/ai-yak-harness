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
 * 4. Клиентская утечка секретов (VITE_*SECRET, VITE_BOT_TOKEN).
 * 5. Небезопасная аутентификация в Telegram Mini Apps (обход проверки подписи initData HMAC-SHA256).
 * 6. Открытые секреты в [vars] файлов wrangler.toml/wrangler.json.
 * 7. Хардкод токенов ботов в конструкторах Bot/TelegramBot/Telegraf.
 * 
 * Исключения помечаются директивой:
 * -- @security-gate-ignore: <причина> (в SQL)
 * // @security-gate-ignore: <причина> (в TS/TSX/JS/TOML)
 */

export function checkRlsPrivilegeEscalation(content, filePath = '') {
    if (content.includes('@security-gate-ignore')) return [];
    const violations = [];

    const hasUpdatePolicyOnProfiles = /CREATE\s+POLICY\s+["']?[^"']+["']?\s+ON\s+(?:public\.)?profiles\s+FOR\s+UPDATE/i.test(content);
    const hasAuthUidMatch = /auth\.uid\(\)\s*=\s*id/i.test(content);

    if (hasUpdatePolicyOnProfiles && hasAuthUidMatch) {
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
        const queriesByNumericId = /WHERE\s+(?:\w+\.)?id\s*=\s*(?:v_id|v_clean_id::bigint|p_report_id::bigint|p_id)/i.test(content) ||
                                  /regexp_replace\([^,]+,\s*['"]\^.*\\d\+\$['"]/i.test(content);
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

    const fallbackRegex = /(?:Deno\.env\.get\([^)]*\)|process\.env(?:\.[a-zA-Z0-9_]+|\[['"][^'"]+['"]\])|import\.meta\.env(?:\.[a-zA-Z0-9_]+|\[['"][^'"]+['"]\]))\s*\|\|\s*['"]([a-zA-Z0-9_\-\.:]{20,})['"]/g;
    let match;
    while ((match = fallbackRegex.exec(content)) !== null) {
        const candidate = match[1];
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

export function checkTmaBotSecretExposure(content, filePath = '') {
    if (content.includes('@security-gate-ignore')) return [];
    const violations = [];

    const hasBotTokenInClient = /(?:import\.meta\.env\.VITE_|process\.env\.NEXT_PUBLIC_|process\.env\.REACT_APP_)[A-Z0-9_]*(?:BOT_TOKEN|TELEGRAM_TOKEN|TG_TOKEN)/i.test(content);
    if (hasBotTokenInClient) {
        violations.push({
            file: filePath,
            message: 'TMA Client Secret Exposure: Bot token referenced via client bundle prefix. Never expose bot tokens to the client; all bot actions and initData validation must happen server-side.'
        });
    }

    return violations;
}

export function checkTmaInitDataBypass(content, filePath = '') {
    if (content.includes('@security-gate-ignore')) return [];
    const violations = [];

    const hasRawInitDataUserParse = /JSON\.parse\s*\(\s*(?:new\s+URLSearchParams\([^)]*init[Dd]ata[^)]*\)\.get\(['"]user['"]\)|[a-zA-Z0-9_]+\.get\(['"]user['"]\))/i.test(content) ||
                                  /initDataUnsafe\s*\.\s*user/i.test(content);
    const hasValidationCall = /validateInitData|verifyTelegramWebAppData|createHmac|crypto\.subtle|crypto\.createHmac|initDataValid/i.test(content);

    if (hasRawInitDataUserParse && !hasValidationCall) {
        violations.push({
            file: filePath,
            message: 'TMA Insecure Authentication: Telegram initData is parsed without HMAC-SHA256 signature verification. Anyone can forge raw user identity. Validate with HMAC-SHA256 using BOT_TOKEN.'
        });
    }

    return violations;
}

export function checkWranglerVarsSecrets(content, filePath = '') {
    if (content.includes('@security-gate-ignore')) return [];
    const violations = [];

    const varsSectionMatch = content.match(/\[vars\]([\s\S]*?)(?=\n\[|$)/i);
    if (varsSectionMatch) {
        const varsContent = varsSectionMatch[1];
        const secretInVarsRegex = /^\s*(?:BOT_TOKEN|API_KEY|SECRET|PASSWORD|PRIVATE_KEY)\s*=\s*['"]([^'"]+)['"]/im;
        const match = varsContent.match(secretInVarsRegex);
        if (match && !match[1].startsWith('mock') && !match[1].startsWith('test')) {
            violations.push({
                file: filePath,
                message: 'Wrangler.toml Plaintext Secret: Sensitive variable defined in [vars]. Plaintext vars are committed to Git and deployed unencrypted. Use \'wrangler secret put <NAME>\' or local \'.dev.vars\'.'
            });
        }
    }

    return violations;
}

export function checkBotHardcodedTokens(content, filePath = '') {
    if (content.includes('@security-gate-ignore')) return [];
    const violations = [];

    const literalTokenInBot = /(?:new\s+Bot|createBot|new\s+TelegramBot|new\s+Telegraf)\s*\(\s*['"]([0-9]{8,10}:[a-zA-Z0-9_-]{35})['"]/g;
    let match;
    while ((match = literalTokenInBot.exec(content)) !== null) {
        const token = match[1];
        if (!token.includes('FAKE') && !token.includes('0000000000')) {
            violations.push({
                file: filePath,
                message: `Hardcoded Bot Token in Constructor (${token.slice(0, 10)}...): pass token via environment variables (process.env.BOT_TOKEN or Worker env.BOT_TOKEN).`
            });
        }
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
    for (const filePath of sqlFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const relPath = path.relative(process.cwd(), filePath);
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
        violations.push(...checkTmaInitDataBypass(content, relPath));
    }

    // 3. Проверка конфигураций Cloudflare Wrangler (wrangler.toml)
    const rootWrangler = path.resolve(process.cwd(), 'wrangler.toml');
    if (fs.existsSync(rootWrangler)) {
        const content = fs.readFileSync(rootWrangler, 'utf-8');
        violations.push(...checkWranglerVarsSecrets(content, 'wrangler.toml'));
    }

    // 4. Проверка фронтенд и бэкенд кода в src/
    const srcDir = path.resolve(process.cwd(), 'src');
    const codeFiles = getAllFiles(srcDir, ['.tsx', '.ts', '.js', '.mjs']);
    for (const filePath of codeFiles) {
        if (filePath.includes('__tests__') || filePath.includes('.test.') || filePath.includes('.spec.')) continue;
        const content = fs.readFileSync(filePath, 'utf-8');
        const relPath = path.relative(process.cwd(), filePath);
        violations.push(...checkFrontendIdorLeaks(content, relPath));
        violations.push(...checkClientSecretExposure(content, relPath));
        violations.push(...checkTmaBotSecretExposure(content, relPath));
        violations.push(...checkHardcodedSecretFallbacks(content, relPath));
        violations.push(...checkTmaInitDataBypass(content, relPath));
        violations.push(...checkBotHardcodedTokens(content, relPath));
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
        console.error('Устраните уязвимость (используйте переменные окружения, криптографическую валидацию)');
        console.error('или, если поведение намеренное, добавьте: // @security-gate-ignore: <причина>\n');
        process.exit(1);
    }

    console.log(`🛡️ [Security Anti-Pattern Gate] Проверено ${sqlFiles.length} миграций, ${codeFiles.length} исходников и wrangler.toml: уязвимостей TMA, ботов и IDOR не обнаружено.`);
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
    verifySecurityAntipatterns();
}
