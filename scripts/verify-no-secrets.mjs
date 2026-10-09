#!/usr/bin/env node
import { execSync } from 'child_process';

/**
 * 🛡️ Pre-Commit Secret Scanner (Tier-3 AI Harness Gate)
 * 
 * Предотвращает случайную фиксацию в Git приватных ключей, боевых токенов Supabase,
 * сервисных ролей и паролей, сгенерированных или вставленных ИИ-агентом.
 * 
 * Если это намеренная фикстура для теста (mock):
 * Запустите с флагом: ALLOW_SECRETS=true git commit ...
 */

function runCommand(cmd) {
    try {
        return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    } catch {
        return '';
    }
}

function verifyNoSecrets() {
    if (process.env.ALLOW_SECRETS === 'true') {
        console.log('🛡️ [Secret Scanner] Проверка секретов пропущена флагом ALLOW_SECRETS=true.');
        process.exit(0);
    }

    let diffOutput = runCommand('git diff --cached -U0');
    if (!diffOutput) {
        diffOutput = runCommand('git diff -U0');
    }

    if (!diffOutput) {
        process.exit(0);
    }

    const secretPatterns = [
        {
            name: 'Private Encryption Key (RSA/EC/OpenSSH)',
            regex: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/,
        },
        {
            name: 'Supabase Service Role JWT Key',
            regex: /eyJ[a-zA-Z0-9_-]{20,}\.eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/,
            filter: (match) => {
                try {
                    const parts = match.split('.');
                    if (parts.length < 2) return false;
                    const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
                    return payload.includes('service_role') || payload.includes('supabase_admin');
                } catch {
                    return false;
                }
            }
        },
        {
            name: 'Supabase CLI / Management Token (sbp_...)',
            regex: /\bsbp_[a-zA-Z0-9]{32,}\b/,
        },
        {
            name: 'AWS Access Key ID',
            regex: /\bAKIA[0-9A-Z]{16}\b/,
        },
        {
            name: 'Slack Webhook / App Token',
            regex: /xox[baprs]-[0-9a-zA-Z]{10,}/,
        },
        {
            name: 'PostgreSQL Connection URI with Password',
            regex: /postgres(?:ql)?:\/\/[^:]+:[^@\s]{6,}@[^/\s]+/,
            filter: (match) => !match.includes('localhost') && !match.includes('127.0.0.1') && !match.includes(':password@') && !match.includes(':test@')
        }
    ];

    const lines = diffOutput.split('\n');
    let currentFile = '';
    const detectedIssues = [];

    for (const line of lines) {
        if (line.startsWith('+++ b/')) {
            currentFile = line.slice(6);
            continue;
        }

        // Проверяем только добавленные строки
        if (!line.startsWith('+') || line.startsWith('+++')) {
            continue;
        }

        const addedContent = line.slice(1);

        // Пропускаем .env.example
        if (currentFile.endsWith('.env.example')) {
            continue;
        }

        for (const pattern of secretPatterns) {
            const match = addedContent.match(pattern.regex);
            if (match) {
                if (pattern.filter && !pattern.filter(match[0])) {
                    continue;
                }
                detectedIssues.push({
                    file: currentFile,
                    type: pattern.name,
                    snippet: addedContent.trim().slice(0, 80)
                });
            }
        }
    }

    if (detectedIssues.length > 0) {
        console.error('\n' + '='.repeat(68));
        console.error('🛑 [AI HARNESS GATE] ОБНАРУЖЕНА ВОЗМОЖНАЯ УТЕЧКА СЕКРЕТОВ!');
        console.error('='.repeat(68));
        console.error('Сканер заблокировал коммит, так как в диффе обнаружены подозрительные');
        console.error('ключи, токены доступа или приватные учетные данные.\n');

        detectedIssues.forEach(issue => {
            console.error(`  ❌ Файл: ${issue.file}`);
            console.error(`     Тип:  ${issue.type}`);
            console.error(`     Код:  ${issue.snippet}...\n`);
        });

        console.error('Что делать:');
        console.error('  1. Удалите секреты из кода и вынесите их в переменные окружения (.env).');
        console.error('  2. Если это мок-данные для теста, используйте абстрактные строки ("mock-token").');
        console.error('  3. Если вы уверены в безопасности коммита:');
        console.error('     👉 ALLOW_SECRETS=true git commit ...\n');
        console.error('='.repeat(68) + '\n');
        process.exit(1);
    }

    process.exit(0);
}

verifyNoSecrets();
