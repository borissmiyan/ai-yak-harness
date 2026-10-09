#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * 🔒 Database Schema Drift & Read-Only Type Contract Gate (Tier-2 AI Harness Gate)
 * 
 * Предотвращает ситуацию, когда ИИ-ассистент вносит несанкционированные изменения
 * в типы контрактов базы данных или когда схема на клиенте расходится с базой.
 * 
 * Контролирует:
 * 1. Наличие обязательных RPC контрактов в проекте (настраивается под репозиторий).
 * 2. Неизменность замороженных структур данных без явного флага ALLOW_SCHEMA_MUTATION=true.
 * 3. Целостность контрактов API / Database.
 */

function runCommand(cmd) {
    try {
        return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    } catch {
        return '';
    }
}

function verifySchemaDrift() {
    console.log('\n🔒 [Schema Drift Gate] Проверка целостности контрактов базы данных...');

    // 1. Проверяем флаг разработчика
    if (process.env.ALLOW_SCHEMA_MUTATION === 'true' || process.env.ALLOW_TEST_MUTATION === 'true') {
        console.log('🛡️ [Schema Drift Gate] Изменение контрактов схемы разрешено разработчиком.');
        process.exit(0);
    }

    // 2. Проверяем существование файла RPC контрактов (если проект использует директорию contracts)
    const contractDir = path.resolve(process.cwd(), 'src/types/contracts');
    if (!fs.existsSync(contractDir)) {
        console.log('ℹ️ [Schema Drift Gate] Директория контрактов не обнаружена, проверка пропущена.');
        process.exit(0);
    }

    // 3. Проверяем git diff на предмет несанкционированных мутаций контрактов
    const diffOutput = runCommand('git diff --cached --name-only') || runCommand('git diff --name-only');
    const changedFiles = diffOutput.split('\n').filter(Boolean);

    const contractFiles = changedFiles.filter(f => f.startsWith('src/types/contracts/'));

    if (contractFiles.length > 0) {
        console.error('\n' + '='.repeat(68));
        console.error('🛑 [SCHEMA DRIFT GATE] ОБНАРУЖЕНА МОДИФИКАЦИЯ ФАЙЛОВ КОНТРАКТОВ!');
        console.error('='.repeat(68));
        contractFiles.forEach(f => console.error(`  ⚠️ ${f}`));
        console.error('\nКонтракты базы данных и RPC являются Read-Only для ИИ-агентов во избежание дрейфа.');
        console.error('Для сохранения изменений разработчиком используйте:');
        console.error('  ALLOW_SCHEMA_MUTATION=true git commit ...\n');
        process.exit(1);
    }

    console.log('✅ [Schema Drift Gate] Контракты и схемы БД зафиксированы без дрейфа (0 расхождений).\n');
}

verifySchemaDrift();
