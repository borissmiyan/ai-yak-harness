#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

/**
 * ⚡ Component Memoization & Render Storm Gate (Эшелон 2 AI-Харнесса)
 * 
 * Проверяет, что списочные и карточные компоненты (*Card.tsx, *Row.tsx, *Item.tsx)
 * обернуты в React.memo / memo() для предотвращения каскадных ре-рендеров
 * при наборе текста в поисковых строках, чате и динамических формах.
 * 
 * Исключения помечаются директивой:
 * // @memo-gate-ignore: <причина>
 */

const SRC_DIR = path.resolve(process.cwd(), 'src');

const LIST_COMPONENT_PATTERNS = [
    /Card\.tsx$/,
    /Row\.tsx$/,
    /Item\.tsx$/,
    /Thumbnail\.tsx$/
];

function getAllComponentFiles(dir) {
    const files = [];
    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== '__tests__' && entry.name !== 'dist') {
                files.push(...getAllComponentFiles(fullPath));
            }
        } else if (entry.name.endsWith('.tsx')) {
            const isTarget = LIST_COMPONENT_PATTERNS.some(pat => pat.test(entry.name));
            if (isTarget && 
                !entry.name.endsWith('.test.tsx') && 
                !entry.name.endsWith('.spec.tsx') &&
                !entry.name.endsWith('.stories.tsx')) {
                files.push(fullPath);
            }
        }
    }
    return files;
}

function verifyMemoization() {
    const files = getAllComponentFiles(SRC_DIR);
    const violations = [];

    for (const filePath of files) {
        const relativePath = path.relative(process.cwd(), filePath);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Проверяем наличие директивы игнорирования
        if (content.includes('@memo-gate-ignore')) {
            continue;
        }

        // Проверяем, обернут ли компонент в memo
        const hasMemo = content.includes('memo(') || 
                        content.includes('React.memo(') ||
                        content.includes('memo<');

        if (!hasMemo) {
            violations.push({
                file: relativePath,
                message: 'Списочный/карточный компонент не обернут в React.memo(). Это вызывает каскадные ре-рендеринг-штормы.'
            });
        }
    }

    if (violations.length > 0) {
        console.error('\n' + '='.repeat(74));
        console.error('🛑 [AI HARNESS GATE] ОБНАРУЖЕНЫ НЕ-МЕМОИЗИРОВАННЫЕ СПИСОЧНЫЕ КОМПОНЕНТЫ:');
        console.error('='.repeat(74));
        violations.forEach(v => {
            console.error(`- ${v.file}`);
            console.error(`  ${v.message}`);
        });
        console.error('='.repeat(74));
        console.error('Оберните компонент в React.memo(MyComponent) или экспортируйте: export const X = memo(...)');
        console.error('Если мемоизация не требуется, добавьте: // @memo-gate-ignore: <причина>\n');
        process.exit(1);
    }

    console.log(`⚡ [Memoization Guard] Проверено ${files.length} списочных и карточных компонентов: все надежно мемоизированы.`);
}

verifyMemoization();
