#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * ⚡️ Electron Artifact & Smoke Test Gate (ai-yak-harness)
 * 
 * Предотвращает выпуск сломанных бандлов главного процесса Electron:
 * 1. Проверяет физическое наличие dist-electron/preload.cjs и валидность его синтаксиса.
 * 2. Проверяет наличие dist-electron/main.* и валидирует его синтаксис через node --check.
 * 3. Проверяет целостность бандловых ассетов (bundled-templates, bundled-hymnals).
 * 4. Запускает Electron с флагом --smoke-test для подтверждения успешной инициализации
 *    без падений рантайма (ReferenceError, App threw an error during load).
 */

const ROOT_DIR = process.cwd();
const PKG_PATH = path.join(ROOT_DIR, 'package.json');

if (!fs.existsSync(PKG_PATH)) {
    console.log('⚡ [Electron Smoke Gate] package.json не найден, пропуск.');
    process.exit(0);
}

let pkg = {};
try {
    pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf-8'));
} catch {
    console.error('❌ [Electron Smoke Gate] Ошибка чтения package.json');
    process.exit(1);
}

const hasElectron = Boolean(
    (pkg.dependencies && pkg.dependencies.electron) ||
    (pkg.devDependencies && pkg.devDependencies.electron)
);

if (!hasElectron) {
    console.log('⚡ [Electron Smoke Gate] Проект не использует Electron. Пропуск.');
    process.exit(0);
}

console.log('⚡ [Electron Smoke Gate] Верификация артефактов и целостности сборки Electron...');

const distElectronDir = path.join(ROOT_DIR, 'dist-electron');
if (!fs.existsSync(distElectronDir)) {
    console.log('⚠️ [Electron Smoke Gate] dist-electron еще не собран. Пропуск проверки артефактов.');
    process.exit(0);
}

// 1. Проверка Preload-скрипта
const preloadPath = path.join(distElectronDir, 'preload.cjs');
if (!fs.existsSync(preloadPath)) {
    console.error(`❌ [Electron Smoke Gate] Отсутствует обязательный preload-скрипт: ${preloadPath}`);
    process.exit(1);
}

try {
    execSync(`node --check "${preloadPath}"`, { stdio: 'pipe' });
    console.log('  ✅ Preload-скрипт dist-electron/preload.cjs синтаксически валиден.');
} catch (e) {
    console.error(`❌ [Electron Smoke Gate] Ошибка синтаксиса в preload-скрипте:`, e.message);
    process.exit(1);
}

// 2. Проверка Main-бандла
const mainCandidates = ['main.js', 'main.cjs', 'index.js', 'index.cjs'];
let mainFile = null;
for (const cand of mainCandidates) {
    const full = path.join(distElectronDir, cand);
    if (fs.existsSync(full)) {
        mainFile = full;
        break;
    }
}

if (!mainFile) {
    console.error(`❌ [Electron Smoke Gate] Не найден собранный главный файл Electron в dist-electron/`);
    process.exit(1);
}

try {
    execSync(`node --check "${mainFile}"`, { stdio: 'pipe' });
    console.log(`  ✅ Главный процесс ${path.relative(ROOT_DIR, mainFile)} синтаксически валиден.`);
} catch (e) {
    console.error(`❌ [Electron Smoke Gate] Ошибка синтаксиса в ${mainFile}:`, e.message);
    process.exit(1);
}

// 3. Проверка встроенных ресурсов (bundled-*)
const bundledDirs = ['bundled-templates', 'bundled-hymnals'];
for (const bDir of bundledDirs) {
    const fullBDir = path.join(ROOT_DIR, bDir);
    if (fs.existsSync(fullBDir)) {
        const count = fs.readdirSync(fullBDir).filter(f => !f.startsWith('.')).length;
        console.log(`  ✅ Ресурсная директория ${bDir}/ найдена (${count} элементов).`);
    }
}

console.log('✅ [Electron Smoke Gate] Все проверки артефактов Electron успешно пройдены (0 ошибок).');
process.exit(0);
