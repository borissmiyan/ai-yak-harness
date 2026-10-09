#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

/**
 * 🎨 AI Design System & Architectural Hard Gate (v2 — Enhanced)
 * 
 * Автоматически валидирует и исправляет (--fix) соответствие кодовой базы стандартам дизайн-системы:
 * 1. COMPONENTS.md Registry Gate: защита от создания дубликатов компонентов агентом (+ Auto-Fix).
 * 2. Zero Emojis in JSX Gate: замена сырых эмодзи на векторные SVG из lucide-react (+ Auto-Fix).
 * 3. TMA Fullscreen Header Gate: резервирование 96px под нативные контролы Telegram (+ Auto-Fix).
 * 4. Motion Hardware Acceleration Gate: запрет анимации layout-свойств (только transform & opacity).
 * 5. WCAG 2.1 AA Contrast Math Gate: расчет коэффициента контрастности цветов (минимум 4.5:1).
 * 6. Tabular Typography Gate: запрет font-mono в таблицах и бейджах (только tabular-nums).
 * 7. File Length Gate: лимит 500 строк на файл во избежание потери контекста LLM.
 * 
 * Использование:
 *   node scripts/verify-design-system.mjs           # Полный аудит
 *   node scripts/verify-design-system.mjs --staged   # Только git staged файлы
 *   node scripts/verify-design-system.mjs --fix      # Автоматическое исправление нарушений
 */

const CWD = process.cwd();
const SRC_DIR = path.resolve(CWD, 'src');

const isStagedOnly = process.argv.includes('--staged');
const isFixMode = process.argv.includes('--fix');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let violations = [];
let warnings = [];
let fixesApplied = [];

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
let componentsDocContent = '';
if (componentsDocPath) {
    componentsDocContent = fs.readFileSync(componentsDocPath, 'utf-8');
    const matches = componentsDocContent.match(/`([A-Z][A-Za-z0-9]+(?:\.tsx)?)`/g);
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

function getStagedFiles() {
    try {
        const { execSync } = require('child_process');
        const out = execSync('git diff --cached --name-only --diff-filter=ACMR', { encoding: 'utf-8' });
        return out.split('\n').filter(Boolean).map(f => path.resolve(CWD, f));
    } catch {
        return [];
    }
}

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

const allSourceFiles = isStagedOnly
    ? getStagedFiles().filter(f => /\.(tsx|jsx|ts|js)$/.test(f) && f.startsWith(SRC_DIR))
    : scanFiles(SRC_DIR);

// Карта для автозамены эмодзи на Lucide-иконки
const EMOJI_TO_LUCIDE = {
    '⚡': { icon: 'Zap', pkg: 'lucide-react' },
    '🛡️': { icon: 'ShieldCheck', pkg: 'lucide-react' },
    '🛡': { icon: 'ShieldCheck', pkg: 'lucide-react' },
    '🔒': { icon: 'Lock', pkg: 'lucide-react' },
    '👤': { icon: 'User', pkg: 'lucide-react' },
    '✉️': { icon: 'Mail', pkg: 'lucide-react' },
    '✉': { icon: 'Mail', pkg: 'lucide-react' },
    '🔑': { icon: 'Key', pkg: 'lucide-react' },
    '🌐': { icon: 'Globe', pkg: 'lucide-react' },
    '📝': { icon: 'FileText', pkg: 'lucide-react' },
    '⚙️': { icon: 'Settings', pkg: 'lucide-react' },
    '🔍': { icon: 'Search', pkg: 'lucide-react' },
    '🗑️': { icon: 'Trash2', pkg: 'lucide-react' },
    '🗑': { icon: 'Trash2', pkg: 'lucide-react' },
    '✏️': { icon: 'Edit3', pkg: 'lucide-react' },
    '✅': { icon: 'Check', pkg: 'lucide-react' },
    '❌': { icon: 'X', pkg: 'lucide-react' },
    '🔔': { icon: 'Bell', pkg: 'lucide-react' },
    '⭐': { icon: 'Star', pkg: 'lucide-react' },
    '📦': { icon: 'Package', pkg: 'lucide-react' },
    '🚀': { icon: 'Rocket', pkg: 'lucide-react' }
};

const EMOJI_REGEX = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;

const LAYOUT_ANIMATION_PROPS = [
    /\banimate\s*=\s*\{\{\s*[^}]*\b(width|height|top|left|bottom|right|margin|padding)\b/i,
    /\btransition\s*:\s*[^;]*\b(width|height|top|left|bottom|right|margin|padding)\b/i
];

// WCAG 2.1 AA Color Contrast Math
function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    if (hex.length !== 6) return null;
    return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16)
    ];
}

function getRelativeLuminance([r, g, b]) {
    const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function calculateContrastRatio(rgb1, rgb2) {
    const l1 = getRelativeLuminance(rgb1);
    const l2 = getRelativeLuminance(rgb2);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// Проверка контраста из DESIGN-AI.md
if (designAiDocPath) {
    const designAiContent = fs.readFileSync(designAiDocPath, 'utf-8');
    const hexMatches = designAiContent.match(/#[0-9a-fA-F]{6}\b/g) || [];
    if (hexMatches.length >= 2) {
        // Проверяем первый темный фон и первый светлый цвет текста
        const darkColors = hexMatches.filter(h => {
            const rgb = hexToRgb(h);
            return rgb && getRelativeLuminance(rgb) < 0.2;
        });
        const lightColors = hexMatches.filter(h => {
            const rgb = hexToRgb(h);
            return rgb && getRelativeLuminance(rgb) > 0.4;
        });

        if (darkColors.length > 0 && lightColors.length > 0) {
            const bgRgb = hexToRgb(darkColors[0]);
            const textRgb = hexToRgb(lightColors[0]);
            const ratio = calculateContrastRatio(bgRgb, textRgb);
            if (ratio < 4.5) {
                violations.push({
                    type: 'WCAG_CONTRAST_VIOLATION',
                    file: path.relative(CWD, designAiDocPath),
                    message: `Коэффициент контраста между ${darkColors[0]} и ${lightColors[0]} составляет ${ratio.toFixed(2)}:1 (требуется минимум 4.5:1 для WCAG 2.1 AA)!`
                });
            }
        }
    }
}

let checkedComponentsCount = 0;
let hasTmaHeaderOffset = false;
const unregisteredFound = [];

for (const filePath of allSourceFiles) {
    const relPath = path.relative(CWD, filePath);
    let content = fs.readFileSync(filePath, 'utf-8');

    if (content.includes('@design-gate-ignore')) {
        continue;
    }

    const lines = content.split('\n');

    // 1. Проверка лимита 500 строк
    if (lines.length > 500) {
        violations.push({
            type: 'FILE_LENGTH_LIMIT',
            file: relPath,
            message: `Файл превышает лимит в 500 строк (${lines.length} строк). Разделите на хуки, утилиты и подкомпоненты.`
        });
    }

    // 2. Проверка регистрации UI-компонентов в COMPONENTS.md
    if (relPath.includes('shared/ui') || relPath.includes('/ui/') || relPath.includes('components/ui')) {
        const baseName = path.basename(filePath, path.extname(filePath));
        if (/^[A-Z]/.test(baseName) && !baseName.includes('.test') && !baseName.includes('.spec') && baseName !== 'index') {
            checkedComponentsCount++;
            if (componentsDocPath && registeredComponents.size > 0 && !registeredComponents.has(baseName)) {
                if (isFixMode) {
                    unregisteredFound.push({ baseName, relPath });
                } else {
                    violations.push({
                        type: 'UNREGISTERED_COMPONENT',
                        file: relPath,
                        message: `Компонент <${baseName}> не найден в ${path.relative(CWD, componentsDocPath)}! Запустите с флагом --fix для авто-регистрации.`
                    });
                }
            }
        }
    }

    // 3. Проверка TMA 96px Fullscreen шапки
    if (isTmaFullscreenMode) {
        if (/pt-\[96px\]|pt-24|paddingTop:\s*['"]?96px|padding-top:\s*96px|--tg-viewport-stable-height-offset/i.test(content)) {
            hasTmaHeaderOffset = true;
        }
    }

    // 4. Проверка и авто-фикс эмодзи в JSX
    if (/\.(tsx|jsx)$/.test(filePath)) {
        let fileModified = false;
        let neededIcons = new Set();

        lines.forEach((line, idx) => {
            if (line.includes('//') && line.indexOf('//') < line.indexOf('<')) return;
            if (EMOJI_REGEX.test(line)) {
                const match = line.match(EMOJI_REGEX);
                const emoji = match ? match[0] : '';
                
                if (isFixMode && EMOJI_TO_LUCIDE[emoji]) {
                    const { icon } = EMOJI_TO_LUCIDE[emoji];
                    neededIcons.add(icon);
                    // Заменяем эмодзи на иконку
                    lines[idx] = line.replace(emoji, `<${icon} className="w-4 h-4 inline-block" />`);
                    fileModified = true;
                    fixesApplied.push(`Заменен эмодзи "${emoji}" на <${icon} /> в ${relPath}:${idx + 1}`);
                } else {
                    violations.push({
                        type: 'EMOJI_IN_JSX',
                        file: `${relPath}:${idx + 1}`,
                        message: `Обнаружен сырой эмодзи "${emoji}" в JSX. Запустите с --fix для авто-замены на иконку lucide-react.`
                    });
                }
            }
        });

        if (fileModified && isFixMode) {
            let updatedContent = lines.join('\n');
            if (neededIcons.size > 0) {
                const iconsArr = Array.from(neededIcons);
                // Проверяем, есть ли уже импорт из lucide-react
                const lucideImportMatch = updatedContent.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/);
                if (lucideImportMatch) {
                    const existing = lucideImportMatch[1].split(',').map(s => s.trim());
                    const merged = Array.from(new Set([...existing, ...iconsArr])).join(', ');
                    updatedContent = updatedContent.replace(lucideImportMatch[0], `import { ${merged} } from 'lucide-react'`);
                } else {
                    updatedContent = `import { ${iconsArr.join(', ')} } from 'lucide-react';\n` + updatedContent;
                }
            }
            fs.writeFileSync(filePath, updatedContent, 'utf-8');
        }
    }

    // 5. Проверка layout-thrashing анимаций
    for (const pattern of LAYOUT_ANIMATION_PROPS) {
        if (pattern.test(content)) {
            violations.push({
                type: 'LAYOUT_ANIMATION_THRASHING',
                file: relPath,
                message: `Обнаружена анимация геометрии (width/height/margin/coords). Разрешено анимировать только transform и opacity для 120 FPS!`
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

// Авто-фикс для COMPONENTS.md
if (isFixMode && unregisteredFound.length > 0 && componentsDocPath) {
    let doc = fs.readFileSync(componentsDocPath, 'utf-8');
    const today = new Date().toISOString().slice(0, 10);
    let appendRows = '\n';
    for (const { baseName, relPath } of unregisteredFound) {
        appendRows += `| \`${baseName}\` | \`${relPath}\` | Auto-registered component | stable | ${today} |\n`;
        fixesApplied.push(`Зарегистрирован <${baseName}> в ${path.relative(CWD, componentsDocPath)}`);
    }
    fs.appendFileSync(componentsDocPath, appendRows, 'utf-8');
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
console.log(`${BOLD}🎨 AI Design System & Architectural Gate Report (v2)${RESET}`);
console.log('='.repeat(70));
console.log(`📁 Просканировано файлов: ${allSourceFiles.length}`);
console.log(`📑 Проверено UI-компонентов: ${checkedComponentsCount}`);
console.log(`📱 Режим TMA Fullscreen: ${isTmaFullscreenMode ? 'Включен (проверка 96px активна)' : 'Выключен'}`);
console.log(`📚 Реестр COMPONENTS.md: ${componentsDocPath ? path.relative(CWD, componentsDocPath) : 'Не найден'}`);

if (fixesApplied.length > 0) {
    console.log(`\n${GREEN}${BOLD}✨ ПРИМЕНЕНЫ АВТО-ИСПРАВЛЕНИЯ (--fix) (${fixesApplied.length}):${RESET}`);
    for (const f of fixesApplied) {
        console.log(`  ${GREEN}✔${RESET} ${f}`);
    }
}

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
    console.log(`Запустите с флагом ${CYAN}node scripts/verify-design-system.mjs --fix${RESET} для авто-исправления.`);
    console.log('='.repeat(70) + '\n');
    process.exit(1);
} else {
    console.log(`\n${GREEN}${BOLD}✅ Все инварианты дизайн-системы полностью соблюдены! (0 нарушений)${RESET}`);
    console.log('='.repeat(70) + '\n');
    process.exit(0);
}
