#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

/**
 * ⚡️ ESM & Runtime Path Geometry Hygiene Gate (ai-yak-harness)
 * 
 * Предотвращает 3 критических класса рантайм-ошибок, невидимых для tsc и lint:
 * 1. Использование CJS-глобалов (__dirname, __filename) в проектах с "type": "module"
 *    без предварительного вычисления через fileURLToPath(import.meta.url).
 * 2. Искажение относительной геометрии путей при бандлинге (path.join(__dirname, '../..')
 *    в electron/ без проверки существования файла fs.existsSync или app.getAppPath()).
 * 3. Неэкранированные вызовы на жестко захардкоженные порты localhost в UI-компонентах
 *    без проверки окружения (isRemote), вызывающие ERR_CONNECTION_REFUSED.
 * 
 * Директивы подавления исключений:
 * // @esm-hygiene-ignore: <причина>
 * // @path-hygiene-ignore: <причина>
 * // @network-hygiene-ignore: <причина>
 */

const ROOT_DIR = process.cwd();
const PKG_PATH = path.join(ROOT_DIR, 'package.json');

let isEsm = false;
if (fs.existsSync(PKG_PATH)) {
    try {
        const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf-8'));
        isEsm = pkg.type === 'module';
    } catch { }
}

function getAllFiles(dir, exts = ['.ts', '.tsx', '.js', '.mjs']) {
    const results = [];
    if (!fs.existsSync(dir)) return results;

    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of list) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
            if (!['node_modules', 'dist', 'dist-electron', 'build', '.git', 'scratch', 'backups'].includes(item.name)) {
                results.push(...getAllFiles(full, exts));
            }
        } else if (exts.includes(path.extname(item.name))) {
            if (!item.name.endsWith('.test.ts') && 
                !item.name.endsWith('.test.tsx') && 
                !item.name.endsWith('.spec.ts') && 
                !item.name.endsWith('.spec.tsx') &&
                !item.name.endsWith('.d.ts')) {
                results.push(full);
            }
        }
    }
    return results;
}

function verifyEsmAndPathHygiene() {
    const violations = [];
    const scanDirs = ['src', 'electron'].filter(d => fs.existsSync(path.join(ROOT_DIR, d)));
    const files = scanDirs.flatMap(d => getAllFiles(path.join(ROOT_DIR, d)));

    for (const filePath of files) {
        const relPath = path.relative(ROOT_DIR, filePath);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        // Check 1: Naked __dirname or __filename in ESM
        if (isEsm) {
            const hasLocalDeclaration = 
                /\b(?:const|let|var)\s+__dirname\b/.test(content) ||
                /\bimport\.meta\.dirname\b/.test(content) ||
                content.includes('@esm-hygiene-ignore');

            const hasFilenameDeclaration =
                /\b(?:const|let|var)\s+__filename\b/.test(content) ||
                /\bimport\.meta\.filename\b/.test(content) ||
                content.includes('@esm-hygiene-ignore');

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.includes('@esm-hygiene-ignore')) continue;

                if (!hasLocalDeclaration && /\b__dirname\b/.test(line)) {
                    // Check if it's not a property access like obj.__dirname
                    if (!/\.\s*__dirname\b/.test(line)) {
                        violations.push({
                            file: relPath,
                            line: i + 1,
                            code: line.trim(),
                            type: 'ESM_NAKED_DIRNAME',
                            message: "Использование CJS-глобала '__dirname' в проекте с \"type\": \"module\". В ESM необходимо явно объявить: const __dirname = path.dirname(fileURLToPath(import.meta.url));"
                        });
                    }
                }

                if (!hasFilenameDeclaration && /\b__filename\b/.test(line)) {
                    if (!/\.\s*__filename\b/.test(line)) {
                        violations.push({
                            file: relPath,
                            line: i + 1,
                            code: line.trim(),
                            type: 'ESM_NAKED_FILENAME',
                            message: "Использование CJS-глобала '__filename' в проекте с \"type\": \"module\". В ESM необходимо явно объявить: const __filename = fileURLToPath(import.meta.url);"
                        });
                    }
                }
            }
        }

        // Check 2: Electron bundle depth mismatch (../../ in electron/)
        if (relPath.startsWith('electron/') && !content.includes('@path-hygiene-ignore')) {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.includes('@path-hygiene-ignore')) continue;

                if (/path\.(?:join|resolve)\s*\(\s*__dirname\s*,\s*['"`]\.\.\/\.\./.test(line)) {
                    // If file doesn't have existence checks or fallback logic
                    if (!content.includes('fs.existsSync') && !content.includes('app.getAppPath()')) {
                        violations.push({
                            file: relPath,
                            line: i + 1,
                            code: line.trim(),
                            type: 'BUNDLE_DEPTH_TRAP',
                            message: "Относительный подъем 'path.join(__dirname, \"../../...\")' внутри electron/. При бандлинге в dist-electron/ глубина папки меняется, что приведет к поиску за пределами проекта. Используйте fs.existsSync или resolveBundledDir()."
                        });
                    }
                }
            }
        }

        // Check 3: Hardcoded localhost/127.0.0.1 port URLs in React UI components
        if (relPath.startsWith('src/') && filePath.endsWith('.tsx') && !content.includes('@network-hygiene-ignore')) {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.includes('@network-hygiene-ignore')) continue;

                const match = line.match(/(?:https?:\/\/)(?:localhost|127\.0\.0\.1):\d+/i);
                if (match) {
                    // Check if enclosed in isRemote or test guard
                    if (!content.includes('isRemote') && !content.includes('process.env.DEV')) {
                        violations.push({
                            file: relPath,
                            line: i + 1,
                            code: line.trim(),
                            type: 'HARDCODED_PORT_FALLBACK',
                            message: `Прямой URL '${match[0]}' в UI-компоненте. Сетевые запросы к локальным портам обязаны быть изолированы проверкой окружения (isRemote) во избежание ERR_CONNECTION_REFUSED.`
                        });
                    }
                }
            }
        }
    }

    console.log('⚡ [ESM & Path Hygiene Gate] Проверка CJS/ESM совместимости и геометрии путей...');
    if (violations.length === 0) {
        console.log(`✅ [ESM & Path Hygiene Gate] Проверено ${files.length} файлов: нарушений не обнаружено.`);
        process.exit(0);
    } else {
        console.error(`\n❌ [ESM & Path Hygiene Gate] Обнаружено ${violations.length} нарушений:\n`);
        for (const v of violations) {
            console.error(`  - ${v.file}:${v.line} [${v.type}]`);
            console.error(`    Строка: ${v.code}`);
            console.error(`    Правило: ${v.message}\n`);
        }
        process.exit(1);
    }
}

verifyEsmAndPathHygiene();
