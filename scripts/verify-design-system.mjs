#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

/**
 * 🎨 AI Design System & Architectural Hard Gate (Эшелон Дизайн-Системы AI-Харнесса)
 * 
 * Автоматически валидирует соответствие кодовой базы стандартам дизайн-системы:
 * 1. COMPONENTS.md Registry Gate: защита от создания дубликатов компонентов агентом.
 * 2. TMA Fullscreen Header Gate: резервирование 96px под нативные контролы Telegram.
 * 3. Motion Hardware Acceleration Gate: запрет анимации layout-свойств (только transform & opacity).
 * 4. Zero Emojis in JSX Gate: запрет сырых эмодзи — только векторные SVG (lucide-react).
 * 5. Tabular Typography Gate: запрет font-mono в таблицах и бейджах (только tabular-nums).
 * 6. File Length Gate: лимит 500 строк на файл во избежание потери контекста LLM.
 * 
 * Исключение отдельного файла помечается в начале:
 * // @design-gate-ignore: <причина>
 */

const CWD = process.cwd();
const SRC_DIR = path.resolve(CWD, 'src');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let violations = [];
let warnings = [];

// Поиск документов дизайн-системы
function findDocFile(fileName) {
    const candidatePaths = [
        path.join(CWD, fileName),
        path.join(CWD, 'docs', fileName),
        path.join(CWD, 'docs', 'design', fileName),
        path.join(CWD, 'templates', 'docs', fileName)
    ];
    for (const p of candidatePaths) {
        if (fs.existsSync(p)) return p;
    }
    return null;
}

const componentsDocPath = findDocFile('COMPONENTS.md');
const designAiDocPath = findDocFile('DESIGN-AI.md');

// 1. Читаем зарегистрированные компоненты из COMPONENTS.md
const registeredComponents = new Set();
if (componentsDocPath) {
    const content = fs.readFileSync(componentsDocPath, 'utf-8');
    const matches = content.match(/`([A-Z][A-Za-z0-9]+(?:\.tsx)?)`/g);
    if (matches) {
        matches.forEach(m => {
            const clean = m.replace(/[`.]/g, '').replace(/tsx$/, '');
            registeredComponents.add(clean);
        });
    }
}

// Проверяем, настроен ли Telegram Mini App Fullscreen
let isTmaFullscreenMode = false;
if (designAiDocPath) {
    const designAiContent = fs.readFileSync(designAiDocPath, 'utf-8');
    if (/Telegram Mini App|TMA/i.test(designAiContent) && /fullscreen|96px/i.test(designAiContent)) {
        isTmaFullscreenMode = true;
    }
}

// Рекурсивный поиск файлов исходного кода
function scanFiles(dir) {
    const result = [];
    if (!fs.existsSync(dir)) return result;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (!['node_modules', '.git', 'dist', 'build', '.next', '.husky', 'coverage'].includes(entry.name)) {
                result.push(...scanFiles(fullPath));
            }
        } else if (/\.(tsx|jsx|ts|js)$/.test(entry.name)) {
            result.push(fullPath);
        }
    }
    return result;
}

const isStagedOnly = process.argv.includes("--staged");

function getStagedFiles() {
    try {
        const { execSync } = require("child_process");
        const out = execSync("git diff --cached --name-only --diff-filter=ACMR", { encoding: "utf-8" });
        return out.split("\n").filter(Boolean).map(f => path.resolve(CWD, f));
    } catch {
        return [];
    }
}

const allSourceFiles = isStagedOnly ? getStagedFiles().filter(f => /\.(tsx|jsx|ts|js)$/.test(f) && f.startsWith(SRC_DIR)) : scanFiles(SRC_DIR);

// Регулярное выражение для сырых эмодзи в JSX (исключая стандартные символы и ASCII)
const EMOJI_REGEX = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;

// Запрещенные для прямого анимирования свойства (вызывают layout thrashing)
const LAYOUT_ANIMATION_PROPS = [
    /\banimate\s*=\s*\{\{\s*[^}]*\b(width|height|top|left|bottom|right|margin|padding)\b/i,
    /\btransition\s*:\s*[^;]*\b(width|height|top|left|bottom|right|margin|padding)\b/i
];

let checkedComponentsCount = 0;
let hasTmaHeaderOffset = false;

for (const filePath of allSourceFiles) {
    const relPath = path.relative(CWD, filePath);
    const content = fs.readFileSync(filePath, 'utf-8');

    if (content.includes('@design-gate-ignore')) {
        continue;
    }

    const lines = content.split('\n');

    // 1. Проверка лимита 500 строк на файл
    if (lines.length > 500) {
        violations.push({
            type: 'FILE_LENGTH_LIMIT',
            file: relPath,
            message: `Файл превышает лимит в 500 строк (${lines.length} строк). Разделите файл на хуки, утилиты и подкомпоненты.`
        });
    }

    // 2. Проверка регистрации UI-компонентов в COMPONENTS.md
    if (relPath.includes('shared/ui') || relPath.includes('/ui/') || relPath.includes('components/ui')) {
        const baseName = path.basename(filePath, path.extname(filePath));
        if (/^[A-Z]/.test(baseName) && !baseName.includes('.test') && !baseName.includes('.spec') && baseName !== 'index') {
            checkedComponentsCount++;
            if (componentsDocPath && registeredComponents.size > 0 && !registeredComponents.has(baseName)) {
                violations.push({
                    type: 'UNREGISTERED_COMPONENT',
                    file: relPath,
                    message: `Компонент <${baseName}> не найден в ${path.relative(CWD, componentsDocPath)}! Зарегистрируйте компонент во избежание дублирования агентами.`
                });
            }
        }
    }

    // 3. Проверка TMA 96px Fullscreen шапки
    if (isTmaFullscreenMode) {
        if (/pt-\[96px\]|pt-24|paddingTop:\s*['"]?96px|padding-top:\s*96px|--tg-viewport-stable-height-offset/i.test(content)) {
            hasTmaHeaderOffset = true;
        }
    }

    // 4. Проверка сырых эмодзи в JSX
    if (/\.(tsx|jsx)$/.test(filePath)) {
        lines.forEach((line, idx) => {
            if (line.includes('//') && line.indexOf('//') < line.indexOf('<')) return;
            if (EMOJI_REGEX.test(line)) {
                const match = line.match(EMOJI_REGEX);
                violations.push({
                    type: 'EMOJI_IN_JSX',
                    file: `${relPath}:${idx + 1}`,
                    message: `Обнаружен сырой эмодзи "${match ? match[0] : '?'}" в JSX. Используйте векторные SVG-иконки из lucide-react.`
                });
            }
        });
    }

    // 5. Проверка layout-thrashing анимаций (Motion Hardware Acceleration)
    for (const pattern of LAYOUT_ANIMATION_PROPS) {
        if (pattern.test(content)) {
            violations.push({
                type: 'LAYOUT_ANIMATION_THRASHING',
                file: relPath,
                message: `Обнаружена анимация геометрии (width/height/margin/coords). Разрешено анимировать только transform и opacity для 120 FPS аппаратного ускорения на GPU.`
            });
            break;
        }
    }

    // 6. Проверка monospace шрифта в таблицах/бейджах
    if (/\.(tsx|jsx)$/.test(filePath)) {
        if (/className\s*=\s*['"][^'"]*\bfont-mono\b[^'"]*['"]/.test(content)) {
            if (!content.includes('code') && !content.includes('pre') && !content.includes('SyntaxHighlighter')) {
                warnings.push({
                    type: 'MONOSPACE_TYPOGRAPHY_WARNING',
                    file: relPath,
                    message: `Класс "font-mono" обнаружен в разметке. Проверьте: для числовых колонок и бейджей следует использовать "font-sans tabular-nums".`
                });
            }
        }
    }
}

// Финальная проверка TMA отступа шапки
if (isTmaFullscreenMode && !hasTmaHeaderOffset && allSourceFiles.length > 0) {
    violations.push({
        type: 'TMA_HEADER_OFFSET_MISSING',
        file: 'src/App.tsx (or root layout)',
        message: `В DESIGN-AI.md указан режим Telegram Mini App Fullscreen, но в корневом макете не найден отступ 96px (pt-[96px] / pt-24). Нативные кнопки Telegram закроют контент!`
    });
}

// Вывод результатов
console.log('\n' + '='.repeat(70));
console.log(`${BOLD}🎨 AI Design System & Architectural Gate Report${RESET}`);
console.log('='.repeat(70));
console.log(`📁 Просканировано файлов: ${allSourceFiles.length}`);
console.log(`📑 Проверено UI-компонентов: ${checkedComponentsCount}`);
console.log(`📱 Режим TMA Fullscreen: ${isTmaFullscreenMode ? 'Включен (проверка 96px активна)' : 'Выключен'}`);
console.log(`📚 Реестр COMPONENTS.md: ${componentsDocPath ? path.relative(CWD, componentsDocPath) : 'Не найден (пропущено)'}`);

if (warnings.length > 0) {
    console.log(`\n${YELLOW}${BOLD}⚠️ ПРЕДУПРЕЖДЕНИЯ ДИЗАЙН-СИСТЕМЫ (${warnings.length}):${RESET}`);
    for (const w of warnings) {
        console.log(`  ${YELLOW}• [${w.type}]${RESET} ${w.file}`);
        console.log(`    ${w.message}`);
    }
}

if (violations.length > 0) {
    console.log(`\n${RED}${BOLD}❌ КРИТИЧЕСКИЕ НАРУШЕНИЯ ДИЗАЙН-СИСТЕМЫ (${violations.length}):${RESET}`);
    for (const v of violations) {
        console.log(`  ${RED}• [${v.type}]${RESET} ${v.file}`);
        console.log(`    ${v.message}`);
    }
    console.log('\n' + '='.repeat(70));
    console.log(`${RED}${BOLD}🛑 КОММИТ ЗАБЛОКИРОВАН: Код не соответствует инвариантам дизайн-системы.${RESET}`);
    console.log(`Исправьте нарушения или добавьте директиву: // @design-gate-ignore: <причина>`);
    console.log('='.repeat(70) + '\n');
    process.exit(1);
} else {
    console.log(`\n${GREEN}${BOLD}✅ Все инварианты дизайн-системы полностью соблюдены! (0 нарушений)${RESET}`);
    console.log('='.repeat(70) + '\n');
    process.exit(0);
}
