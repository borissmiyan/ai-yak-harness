#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * 🚀 AI Yak Harness 1-Click Installer (Universal Standard)
 * 
 * Автоматически подключает полный инженерный и когнитивный контур (AI Harness):
 * 1. 8 столпов контроля качества (diff-budget, no-secrets, memory hygiene, anti-tampering)
 * 2. Архитектурное планирование (ADR, .planning/CONTEXT.md)
 * 3. Локальные правила поддиректорий (folder-scoped AGENTS.md)
 * 4. Полный пакет скиллов для автономных ИИ-агентов (adversarial-critic, brainstorming, writing-plans и др.)
 * 5. Реестры документации и дизайн-системы (PURPOSE, DESIGN-AI, COMPONENTS, ANTIPATTERNS)
 * 
 * Использование:
 * node /path/to/ai-yak-harness/setup.mjs [целевая_папка_проекта]
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

console.log('='.repeat(70));
console.log('🚀 [AI Yak Harness Installer] Инициализация полного инженерного контура...');
console.log(`📁 Целевой проект: ${targetDir}`);
console.log('='.repeat(70));

const pkgPath = path.join(targetDir, 'package.json');
if (!fs.existsSync(pkgPath)) {
    console.error(`❌ Ошибка: В директории ${targetDir} не найден package.json!`);
    process.exit(1);
}

// 1. Создаем необходимые директории
const dirsToCreate = [
    path.join(targetDir, 'scripts'),
    path.join(targetDir, '.husky'),
    path.join(targetDir, '.github', 'workflows'),
    path.join(targetDir, '.planning', 'decisions'),
    path.join(targetDir, '.agents', 'skills'),
    path.join(targetDir, '.agents', 'rules', 'folder-scoped'),
    path.join(targetDir, 'src', 'test'),
    path.join(targetDir, 'src', 'utils'),
    path.join(targetDir, 'e2e'),
    path.join(targetDir, 'configs')
];

for (const dir of dirsToCreate) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Создана папка: ${path.relative(targetDir, dir)}`);
    }
}

// 2. Копируем проверочные скрипты верификации (scripts/)
const scriptsSourceDir = path.join(__dirname, 'scripts');
const scriptsTargetDir = path.join(targetDir, 'scripts');

if (fs.existsSync(scriptsSourceDir)) {
    const scriptFiles = fs.readdirSync(scriptsSourceDir);
    for (const file of scriptFiles) {
        const srcFile = path.join(scriptsSourceDir, file);
        const destFile = path.join(scriptsTargetDir, file);
        fs.copyFileSync(srcFile, destFile);
        try {
            fs.chmodSync(destFile, 0o755);
        } catch {}
        console.log(`  📜 Установлен скрипт верификации: scripts/${file}`);
    }
}

// 3. Копируем Git-хуки (.husky/)
const hooksSourceDir = path.join(__dirname, 'hooks');
const hooksTargetDir = path.join(targetDir, '.husky');

if (fs.existsSync(hooksSourceDir)) {
    const hookFiles = fs.readdirSync(hooksSourceDir);
    for (const file of hookFiles) {
        const srcFile = path.join(hooksSourceDir, file);
        const destFile = path.join(hooksTargetDir, file);
        fs.copyFileSync(srcFile, destFile);
        try {
            fs.chmodSync(destFile, 0o755);
        } catch {}
        console.log(`  🪝 Установлен Git-хук: .husky/${file}`);
    }
}

// 4. Копируем GitHub Actions Workflow
const ciSourceFile = path.join(__dirname, 'ci', 'ci-quality-gate.yml');
const ciTargetFile = path.join(targetDir, '.github', 'workflows', 'ci-quality-gate.yml');

if (fs.existsSync(ciSourceFile)) {
    fs.copyFileSync(ciSourceFile, ciTargetFile);
    console.log(`  🤖 Установлен CI Quality Gate: .github/workflows/ci-quality-gate.yml`);
}

// 5. Копируем полный боевой комплект скиллов (.agents/skills/)
const skillsSourceDir = path.join(__dirname, 'skills');
if (fs.existsSync(skillsSourceDir)) {
    const skillDirs = fs.readdirSync(skillsSourceDir);
    for (const skillName of skillDirs) {
        const srcSkillDir = path.join(skillsSourceDir, skillName);
        if (fs.statSync(srcSkillDir).isDirectory()) {
            const destSkillDir = path.join(targetDir, '.agents', 'skills', skillName);
            fs.mkdirSync(destSkillDir, { recursive: true });
            
            const copyRecursive = (src, dest) => {
                const entries = fs.readdirSync(src, { withFileTypes: true });
                for (const entry of entries) {
                    const srcPath = path.join(src, entry.name);
                    const destPath = path.join(dest, entry.name);
                    if (entry.isDirectory()) {
                        fs.mkdirSync(destPath, { recursive: true });
                        copyRecursive(srcPath, destPath);
                    } else if (!fs.existsSync(destPath)) {
                        fs.copyFileSync(srcPath, destPath);
                    }
                }
            };
            copyRecursive(srcSkillDir, destSkillDir);
            console.log(`  🧠 Установлен скилл агента: .agents/skills/${skillName}`);
        }
    }
}

// 6. Устанавливаем архитектурный контекст и ADR (.planning/)
const planningSrcDir = path.join(__dirname, 'templates', 'planning');
if (fs.existsSync(planningSrcDir)) {
    const contextSrc = path.join(planningSrcDir, 'CONTEXT.md');
    const contextDest = path.join(targetDir, '.planning', 'CONTEXT.md');
    if (!fs.existsSync(contextDest)) {
        fs.copyFileSync(contextSrc, contextDest);
        console.log(`  📑 Создан архитектурный контекст: .planning/CONTEXT.md`);
    }

    const templateSrc = path.join(planningSrcDir, 'decisions', 'TEMPLATE.md');
    const templateDest = path.join(targetDir, '.planning', 'decisions', 'TEMPLATE.md');
    if (!fs.existsSync(templateDest)) {
        fs.copyFileSync(templateSrc, templateDest);
        console.log(`  🏛 Установлен шаблон решений: .planning/decisions/TEMPLATE.md`);
    }

    const d01Src = path.join(planningSrcDir, 'decisions', 'D-01-initial-architecture.md');
    const d01Dest = path.join(targetDir, '.planning', 'decisions', 'D-01-initial-architecture.md');
    if (!fs.existsSync(d01Dest)) {
        fs.copyFileSync(d01Src, d01Dest);
        console.log(`  🏛 Установлено базовое решение: .planning/decisions/D-01-initial-architecture.md`);
    }
}

// 7. Устанавливаем реестры документации и дизайн-системы (PURPOSE, DESIGN-AI, COMPONENTS, ANTIPATTERNS)
const docsSrcDir = path.join(__dirname, 'templates', 'docs');
if (fs.existsSync(docsSrcDir)) {
    const docFiles = [
        { file: 'PURPOSE.md', label: 'Product Mission & Scope' },
        { file: 'DESIGN-AI.md', label: 'Machine-Readable Design Tokens' },
        { file: 'COMPONENTS.md', label: 'Component Registry (Anti-Duplicate)' },
        { file: 'ANTIPATTERNS.md', label: 'Forbidden Antipatterns Registry' }
    ];

    for (const { file, label } of docFiles) {
        const srcPath = path.join(docsSrcDir, file);
        const destPath = path.join(targetDir, file);
        if (fs.existsSync(srcPath) && !fs.existsSync(destPath)) {
            fs.copyFileSync(srcPath, destPath);
            console.log(`  📋 Установлен реестр: ${file} (${label})`);
        }
    }
}

// 8. Устанавливаем локальные правила для поддиректорий (Folder-Scoped AGENTS.md)
const scopedRulesSrc = path.join(__dirname, 'templates', 'rules', 'scoped');
if (fs.existsSync(scopedRulesSrc)) {
    const folderMappings = [
        { folder: path.join('src', 'services'), ruleFile: 'services-AGENTS.md' },
        { folder: path.join('src', 'shared', 'ui'), ruleFile: 'ui-AGENTS.md' },
        { folder: path.join('src', 'features'), ruleFile: 'features-AGENTS.md' },
        { folder: path.join('src', 'types'), ruleFile: 'types-AGENTS.md' },
        { folder: path.join('src', 'db'), ruleFile: 'db-AGENTS.md' },
        { folder: path.join('src', 'utils'), ruleFile: 'utils-AGENTS.md' }
    ];

    for (const { folder, ruleFile } of folderMappings) {
        const targetFolder = path.join(targetDir, folder);
        const ruleSrc = path.join(scopedRulesSrc, ruleFile);
        
        // Всегда сохраняем эталон в .agents/rules/folder-scoped/
        const backupDest = path.join(targetDir, '.agents', 'rules', 'folder-scoped', ruleFile);
        if (fs.existsSync(ruleSrc) && !fs.existsSync(backupDest)) {
            fs.copyFileSync(ruleSrc, backupDest);
        }

        // Если папка существует в проекте, кладем AGENTS.md прямо туда
        if (fs.existsSync(targetFolder) && fs.existsSync(ruleSrc)) {
            const folderAgentsDest = path.join(targetFolder, 'AGENTS.md');
            if (!fs.existsSync(folderAgentsDest)) {
                fs.copyFileSync(ruleSrc, folderAgentsDest);
                console.log(`  📂 Установлены локальные правила для папки: ${folder}/AGENTS.md`);
            }
        }
    }
}

// 9. Копируем конфигурационные шаблоны и сниппеты
const configsToCopy = [
    { src: path.join(__dirname, 'configs', 'knip.json'), dest: path.join(targetDir, 'knip.json'), label: 'Knip Config' },
    { src: path.join(__dirname, 'configs', 'tsconfig.test.json'), dest: path.join(targetDir, 'tsconfig.test.json'), label: 'TypeScript Test Config' },
    { src: path.join(__dirname, 'configs', 'stryker.config.mjs'), dest: path.join(targetDir, 'stryker.config.mjs'), label: 'Stryker Mutator Config' },
    { src: path.join(__dirname, 'configs', 'eslint.config.harness.js'), dest: path.join(targetDir, 'configs', 'eslint.config.harness.js'), label: 'ESLint AST Harness Rules' },
    { src: path.join(__dirname, 'configs', 'vite.config.snippet.ts'), dest: path.join(targetDir, 'configs', 'vite.config.snippet.ts'), label: 'Vite Visualizer Snippet' },
    { src: path.join(__dirname, 'configs', 'react-scan.snippet.ts'), dest: path.join(targetDir, 'configs', 'react-scan.snippet.ts'), label: 'React-Scan Profiler Snippet' },
    { src: path.join(__dirname, 'configs', 'playwright.config.snippet.ts'), dest: path.join(targetDir, 'configs', 'playwright.config.snippet.ts'), label: 'Playwright Config Snippet' },
    { src: path.join(__dirname, 'test', 'vitest.config.snippet.ts'), dest: path.join(targetDir, 'configs', 'vitest.config.snippet.ts'), label: 'Vitest Config Snippet' },
    { src: path.join(__dirname, 'test', 'setup.ts'), dest: path.join(targetDir, 'src', 'test', 'setup.ts'), label: 'Hermetic Test Setup' },
    { src: path.join(__dirname, 'utils', 'security.ts'), dest: path.join(targetDir, 'src', 'utils', 'security.ts'), label: 'Security Sanitizers (DOMPurify)' }
];

for (const cfg of configsToCopy) {
    if (fs.existsSync(cfg.src) && !fs.existsSync(cfg.dest)) {
        fs.copyFileSync(cfg.src, cfg.dest);
        console.log(`  ⚙️ Установлен конфиг: ${path.relative(targetDir, cfg.dest)} (${cfg.label})`);
    }
}

// 10. Копируем E2E шаблоны Playwright (e2e/)
const e2eSourceDir = path.join(__dirname, 'e2e');
const e2eTargetDir = path.join(targetDir, 'e2e');

if (fs.existsSync(e2eSourceDir)) {
    const e2eFiles = fs.readdirSync(e2eSourceDir);
    for (const file of e2eFiles) {
        const srcFile = path.join(e2eSourceDir, file);
        const destFile = path.join(e2eTargetDir, file);
        if (!fs.existsSync(destFile)) {
            fs.copyFileSync(srcFile, destFile);
            console.log(`  🎭 Установлен Playwright тест: e2e/${file}`);
        }
    }
}

// 11. Безопасно обновляем package.json
const pkgRaw = fs.readFileSync(pkgPath, 'utf-8');
const pkg = JSON.parse(pkgRaw);
pkg.scripts = pkg.scripts || {};

const harnessScripts = {
    'check:types': 'tsc -b || tsc --noEmit',
    'check:circular': 'node scripts/verify-no-circular.mjs',
    'check:hygiene': 'node scripts/verify-resource-hygiene.mjs',
    'check:memo': 'node scripts/verify-memoization.mjs',
    'check:design': 'node scripts/verify-design-system.mjs',
    'check:design:fix': 'node scripts/verify-design-system.mjs --fix',
    'design:export-tokens': 'node scripts/export-design-tokens.mjs',
    'design:scaffold-ui': 'node scripts/scaffold-ui-kit.mjs',
    'design:showcase': 'node scripts/generate-design-showcase.mjs',
    'check:dead-code': 'knip',
    'check:schema-drift': 'node scripts/verify-schema-drift.mjs',
    'build:analyze': 'ANALYZE=true vite build',
    'harness:worktree': 'node scripts/harness-worktree.mjs',
    'test:flaky': 'node scripts/test-flaky.mjs',
    'test:silent': 'vitest run --reporter=./scripts/silent-reporter.mjs',
    'test:mutate': 'stryker run',
    'check:security:snyk': 'snyk test',
    'test:pre-push': 'npm run check',
    'verify:remote': 'node scripts/verify-remote-ci.mjs',
    'push:verify': 'node scripts/verify-remote-ci.mjs --push',
    'harness:rollback': 'node scripts/harness-rollback.mjs',
    'prepare': 'husky'
};

let modifiedScripts = 0;
for (const [key, value] of Object.entries(harnessScripts)) {
    if (!pkg.scripts[key]) {
        pkg.scripts[key] = value;
        modifiedScripts++;
        console.log(`  ➕ Добавлен npm script: "${key}": "${value}"`);
    }
}

if (!pkg.scripts.check) {
    pkg.scripts.check = 'tsc --noEmit && eslint src && vitest run';
    modifiedScripts++;
    console.log(`  ➕ Сформирован базовый unified check: "check": "${pkg.scripts.check}"`);
}

if (!pkg['lint-staged']) {
    pkg['lint-staged'] = {
        '*.{ts,tsx}': [
            'eslint --fix',
            'vitest related --run'
        ]
    };
    modifiedScripts++;
    console.log('  ➕ Добавлена секция "lint-staged" для мгновенной валидации измененных файлов.');
}

if (modifiedScripts > 0) {
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
    console.log(`📝 Обновлен package.json (+${modifiedScripts} параметров).`);
}

// 12. Проверка и инструкция по правилам для агента
const agentsRulePath = path.join(targetDir, 'AGENTS.md');
const snippetSource = path.join(__dirname, 'rules', 'AGENTS_HARNESS_SNIPPET.md');

if (!fs.existsSync(agentsRulePath) && fs.existsSync(snippetSource)) {
    fs.copyFileSync(snippetSource, agentsRulePath);
    console.log(`📋 Создан корневой файл правил для ИИ: AGENTS.md`);
}

console.log('\n' + '='.repeat(70));
console.log('✅ AI Yak Harness успешно подключен в полном объеме!');
console.log('='.repeat(70));
console.log('Установленные подсистемы:');
console.log('  1. 🛡️  8 инженерных столпов качества (diff-budget, secrets, hygiene, memo, etc.)');
console.log('  2. 🧠 7 скиллов для агента (.agents/skills/: critic, brainstorming, plans, audit)');
console.log('  3. 📑 Архитектурный контекст и ADR (.planning/CONTEXT.md, decisions/)');
console.log('  4. 🎨 Документация и дизайн-система (PURPOSE, DESIGN-AI, COMPONENTS, ANTIPATTERNS)');
console.log('  5. 📂 Локальные правила поддиректорий (folder-scoped AGENTS.md)');
console.log('\nСледующие шаги:');
console.log('1. Убедитесь, что установлены devDependencies:');
console.log('   npm i -D husky lint-staged knip dpdm eslint-plugin-sonarjs eslint-plugin-promise rollup-plugin-visualizer @stryker-mutator/core @stryker-mutator/vitest-runner snyk react-scan');
console.log('2. Инициализируйте хуки: npm run prepare');
console.log('3. Заполните .planning/CONTEXT.md и PURPOSE.md');
console.log('\n⚠️ ВАЖНО: Stryker CLI (npm run test:mutate) и Snyk (npm run check:security:snyk)');
console.log('   запускаются ТОЛЬКО по прямому явному указанию разработчика.');
console.log('='.repeat(70) + '\n');
