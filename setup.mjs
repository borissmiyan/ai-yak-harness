#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * 🚀 AI Engineering Harness 1-Click Installer (Universal Standard)
 * 
 * Автоматически подключает полный защитный контур (AI Harness)
 * в любой JavaScript / TypeScript проект.
 * 
 * Использование:
 * node ai-yak-harness/setup.mjs [целевая_папка_проекта]
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

console.log('='.repeat(70));
console.log('🚀 [AI Harness Installer] Инициализация полного защитного контура...');
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
    path.join(targetDir, '.agents', 'skills', 'adversarial-critic'),
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

// 2. Копируем скрипты верификации
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
        console.log(`  🛡️ Установлен скрипт: scripts/${file}`);
    }
}

// 3. Копируем хуки Husky
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

// 5. Копируем скилл Adversarial Critic
const skillSourceFile = path.join(__dirname, 'skills', 'adversarial-critic', 'SKILL.md');
const skillTargetFile = path.join(targetDir, '.agents', 'skills', 'adversarial-critic', 'SKILL.md');

if (fs.existsSync(skillSourceFile) && !fs.existsSync(skillTargetFile)) {
    fs.copyFileSync(skillSourceFile, skillTargetFile);
    console.log(`  🕵️ Установлен скилл Сомневающегося Агента: .agents/skills/adversarial-critic/SKILL.md`);
}

// 6. Копируем конфигурационные шаблоны и сниппеты
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

// 6.5. Копируем E2E шаблоны Playwright (e2e/)
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

// 7. Безопасно обновляем package.json
const pkgRaw = fs.readFileSync(pkgPath, 'utf-8');
const pkg = JSON.parse(pkgRaw);
pkg.scripts = pkg.scripts || {};

const harnessScripts = {
    'check:types': 'tsc -b || tsc --noEmit',
    'check:circular': 'node scripts/verify-no-circular.mjs',
    'check:hygiene': 'node scripts/verify-resource-hygiene.mjs',
    'check:memo': 'node scripts/verify-memoization.mjs',
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

// Если в проекте нет базового "check", добавляем шаблон
if (!pkg.scripts.check) {
    pkg.scripts.check = 'tsc --noEmit && eslint src && vitest run';
    modifiedScripts++;
    console.log(`  ➕ Сформирован базовый unified check: "check": "${pkg.scripts.check}"`);
}

// Настраиваем lint-staged
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

// 8. Проверка и инструкция по правилам для агента
const agentsRulePath = path.join(targetDir, 'AGENTS.md');
const snippetSource = path.join(__dirname, 'rules', 'AGENTS_HARNESS_SNIPPET.md');

if (!fs.existsSync(agentsRulePath) && fs.existsSync(snippetSource)) {
    fs.copyFileSync(snippetSource, agentsRulePath);
    console.log(`📋 Создан файл правил для ИИ: AGENTS.md`);
} else if (fs.existsSync(agentsRulePath)) {
    console.log(`💡 AGENTS.md уже существует. Рекомендуется дополнить его правилами из ai-yak-harness/rules/AGENTS_HARNESS_SNIPPET.md`);
}

console.log('\n' + '='.repeat(70));
console.log('✅ AI Engineering Harness успешно подключен в полном объеме!');
console.log('='.repeat(70));
console.log('Следующие шаги:');
console.log('1. Убедитесь, что установлены devDependencies:');
console.log('   npm i -D husky lint-staged knip dpdm eslint-plugin-sonarjs eslint-plugin-promise rollup-plugin-visualizer @stryker-mutator/core @stryker-mutator/vitest-runner snyk react-scan');
console.log('2. Инициализируйте хуки: npm run prepare');
console.log('3. Проверьте статус всех гейтов:');
console.log('   - node scripts/verify-diff-budget.mjs');
console.log('   - node scripts/verify-no-secrets.mjs');
console.log('   - node scripts/verify-resource-hygiene.mjs');
console.log('   - node scripts/verify-memoization.mjs');
console.log('   - node scripts/verify-schema-drift.mjs');
console.log('   - npm run check');
console.log('\n⚠️ ВАЖНО: Stryker CLI (npm run test:mutate) и Snyk (npm run check:security:snyk)');
console.log('   запускаются ТОЛЬКО по прямому явному указанию разработчика.');
console.log('='.repeat(70) + '\n');
