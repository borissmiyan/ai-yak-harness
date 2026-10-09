#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

/**
 * 🛡️ Resource Hygiene & Leak Prevention Gate (Эшелон 2 AI-Харнесса)
 * 
 * Проверяет кодовую базу на типичные источники утечек памяти в долгоживущих SPA:
 * 1. URL.createObjectURL() без последующего URL.revokeObjectURL().
 * 2. addEventListener() в useEffect без парного removeEventListener() или AbortController.
 * 3. setInterval() без парного clearInterval().
 * 
 * Исключения помечаются директивой:
 * // @resource-hygiene-ignore: <причина>
 */

const SRC_DIR = path.resolve(process.cwd(), 'src');

function getAllFiles(dir, exts = ['.ts', '.tsx', '.js', '.jsx']) {
    const files = [];
    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== '__tests__' && entry.name !== 'dist') {
                files.push(...getAllFiles(fullPath, exts));
            }
        } else if (exts.includes(path.extname(entry.name))) {
            // Исключаем тесты и d.ts
            if (!entry.name.endsWith('.test.ts') && 
                !entry.name.endsWith('.test.tsx') && 
                !entry.name.endsWith('.spec.ts') && 
                !entry.name.endsWith('.spec.tsx') &&
                !entry.name.endsWith('.d.ts')) {
                files.push(fullPath);
            }
        }
    }
    return files;
}

function verifyResourceHygiene() {
    const files = getAllFiles(SRC_DIR);
    const violations = [];

    for (const filePath of files) {
        const relativePath = path.relative(process.cwd(), filePath);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        // 1. Проверка setInterval без clearInterval
        if (content.includes('setInterval(')) {
            const hasClearInterval = content.includes('clearInterval(');
            const hasIgnore = content.includes('@resource-hygiene-ignore') || content.includes('eslint-disable');
            if (!hasClearInterval && !hasIgnore) {
                const lineIdx = lines.findIndex(l => l.includes('setInterval('));
                violations.push({
                    file: relativePath,
                    line: lineIdx + 1,
                    type: 'setInterval without clearInterval',
                    message: 'Вызов setInterval() найден без соответствующего clearInterval(). Риск утечки таймера при демонтировании компонента.'
                });
            }
        }

        // 2. Проверка URL.createObjectURL в UI компонентах (*.tsx) без revokeObjectURL
        if (filePath.endsWith('.tsx') && content.includes('URL.createObjectURL(')) {
            const hasRevoke = content.includes('revokeObjectURL(');
            const hasIgnore = content.includes('@resource-hygiene-ignore');
            if (!hasRevoke && !hasIgnore) {
                const lineIdx = lines.findIndex(l => l.includes('URL.createObjectURL('));
                violations.push({
                    file: relativePath,
                    line: lineIdx + 1,
                    type: 'URL.createObjectURL without URL.revokeObjectURL',
                    message: 'Blob URL создан в UI-компоненте, но не освобождается через URL.revokeObjectURL(). Добавьте cleanup в useEffect или директиву // @resource-hygiene-ignore: <причина>.'
                });
            }
        }

        // 3. Проверка addEventListener в useEffect без removeEventListener или abort
        if (content.includes('addEventListener(') && content.includes('useEffect(')) {
            const hasRemove = content.includes('removeEventListener(') || content.includes('AbortController') || content.includes('signal');
            const hasIgnore = content.includes('@resource-hygiene-ignore');
            if (!hasRemove && !hasIgnore) {
                const lineIdx = lines.findIndex(l => l.includes('addEventListener('));
                violations.push({
                    file: relativePath,
                    line: lineIdx + 1,
                    type: 'addEventListener in useEffect without cleanup',
                    message: 'Слушатель событий добавлен в компоненте с useEffect, но нет removeEventListener() или AbortController. Риск накопления слушателей.'
                });
            }
        }
    }

    if (violations.length > 0) {
        console.error('\n' + '='.repeat(72));
        console.error('🛑 [AI HARNESS GATE] ОБНАРУЖЕНЫ ПОТЕНЦИАЛЬНЫЕ УТЕЧКИ РЕСУРСОВ В КОДЕ:');
        console.error('='.repeat(72));
        violations.forEach(v => {
            console.error(`- ${v.file}:${v.line}`);
            console.error(`  Тип: [${v.type}]`);
            console.error(`  Подробности: ${v.message}`);
        });
        console.error('='.repeat(72));
        console.error('Исправьте очистку ресурсов (cleanup в useEffect) или, если поведение намеренное,');
        console.error('добавьте комментарий: // @resource-hygiene-ignore: <причина>\n');
        process.exit(1);
    }

    console.log(`🛡️ [Resource Hygiene Guard] Проверено ${files.length} файлов: утечек таймеров, слушателей и Blob URL не обнаружено.`);
}

verifyResourceHygiene();
