#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

/**
 * 🔄 AI Yak Harness Universal Project Updater (v1.1.0)
 * 
 * Автоматически и безопасно обновляет инженерный контур AI Yak Harness в существующих проектах:
 * - Обновляет проверочные скрипты (scripts/verify-*.mjs) до последней версии.
 * - Устанавливает новые AST-правила и манифест лимитов (configs/harness-limits.json, eslint.config.harness.js).
 * - Накатывает новые архитектурные решения (ADR D-03, D-04).
 * - Подмешивает новые npm-скрипты в package.json (check:component-budget, test).
 * - Обновляет pre-commit хук в fail-closed режим.
 * - ОБЕСПЕЧИВАЕТ СОХРАННОСТЬ: никогда не перезаписывает CONTEXT.md, USER_PROFILE.md,
 *   project-rules.md, COMPONENTS.md, PURPOSE.md и кастомные исключения budget-exceptions.json.
 * 
 * Использование:
 *   node update.mjs                    - интерактивный выбор проекта из соседних папок
 *   node update.mjs <путь_к_проекту>   - обновить конкретный проект
 *   node update.mjs --all              - обновить все обнаруженные проекты в родительской директории
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Копирование директории с перезаписью
function copyDirectoryOverwrite(srcDir, destDir) {
    if (!fs.existsSync(srcDir)) return 0;
    fs.mkdirSync(destDir, { recursive: true });
    let count = 0;

    const entries = fs.readdirSync(srcDir, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(srcDir, entry.name);
        const destPath = path.join(destDir, entry.name);

        if (entry.isDirectory()) {
            count += copyDirectoryOverwrite(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
            try {
                fs.chmodSync(destPath, 0o755);
            } catch {}
            count++;
        }
    }
    return count;
}

// Обновление одного проекта
export function upgradeProject(targetDir) {
    const resolvedTarget = path.resolve(targetDir);
    console.log('\n' + '='.repeat(70));
    console.log(`🔄 [AI Yak Harness Updater] Обновление проекта: ${path.basename(resolvedTarget)}`);
    console.log(`📁 Директория: ${resolvedTarget}`);
    console.log('='.repeat(70));

    const pkgPath = path.join(resolvedTarget, 'package.json');
    if (!fs.existsSync(pkgPath)) {
        console.error(`❌ Ошибка: В директории ${resolvedTarget} не найден package.json!`);
        return false;
    }

    let updatedFilesCount = 0;

    // 1. Обновляем проверочные скрипты верификации (scripts/)
    const scriptsSrc = path.join(__dirname, 'scripts');
    const scriptsDest = path.join(resolvedTarget, 'scripts');
    if (fs.existsSync(scriptsSrc)) {
        const copied = copyDirectoryOverwrite(scriptsSrc, scriptsDest);
        updatedFilesCount += copied;
        console.log(`  📜 Обновлены проверочные скрипты: scripts/ (${copied} файлов)`);
    }

    // 2. Обновляем Git-хуки (.husky/)
    const hooksSrc = path.join(__dirname, 'hooks');
    const hooksDest = path.join(resolvedTarget, '.husky');
    if (fs.existsSync(hooksSrc)) {
        const copied = copyDirectoryOverwrite(hooksSrc, hooksDest);
        updatedFilesCount += copied;
        console.log(`  🪝 Обновлены Git-хуки: .husky/ (${copied} файлов, режим fail-closed)`);
    }

    // 3. Обновляем CI Quality Gate
    const ciSrc = path.join(__dirname, 'ci', 'ci-quality-gate.yml');
    const ciDest = path.join(resolvedTarget, '.github', 'workflows', 'ci-quality-gate.yml');
    if (fs.existsSync(ciSrc)) {
        fs.mkdirSync(path.dirname(ciDest), { recursive: true });
        fs.copyFileSync(ciSrc, ciDest);
        updatedFilesCount++;
        console.log(`  🤖 Обновлен CI Quality Gate: .github/workflows/ci-quality-gate.yml`);
    }

    // 4. Обновляем боевые скиллы (.agents/skills/)
    const skillsSrc = path.join(__dirname, 'skills');
    const skillsDest = path.join(resolvedTarget, '.agents', 'skills');
    if (fs.existsSync(skillsSrc)) {
        const copied = copyDirectoryOverwrite(skillsSrc, skillsDest);
        updatedFilesCount += copied;
        console.log(`  🧠 Обновлены ИИ-скиллы: .agents/skills/ (${copied} файлов)`);
    }

    // 5. Обновляем конфигурационные файлы харнесса (configs/)
    fs.mkdirSync(path.join(resolvedTarget, 'configs'), { recursive: true });
    
    // Файлы конфигурации, которые ВСЕГДА обновляются до последней версии стандарта
    const alwaysUpdateConfigs = [
        { src: path.join(__dirname, 'configs', 'harness-limits.json'), dest: path.join(resolvedTarget, 'configs', 'harness-limits.json'), label: 'Harness Limits Manifest (D-04)' },
        { src: path.join(__dirname, 'configs', 'eslint.config.harness.js'), dest: path.join(resolvedTarget, 'configs', 'eslint.config.harness.js'), label: 'ESLint AST Harness Rules' },
        { src: path.join(__dirname, 'configs', 'stryker.config.mjs'), dest: path.join(resolvedTarget, 'stryker.config.mjs'), label: 'Stryker Config' },
        { src: path.join(__dirname, 'configs', '.auditrc.json'), dest: path.join(resolvedTarget, '.auditrc.json'), label: 'Codebase Audit Config' }
    ];

    for (const cfg of alwaysUpdateConfigs) {
        if (fs.existsSync(cfg.src)) {
            fs.copyFileSync(cfg.src, cfg.dest);
            updatedFilesCount++;
            console.log(`  ⚙️ Обновлен конфиг: ${path.relative(resolvedTarget, cfg.dest)} (${cfg.label})`);
        }
    }

    // Файлы конфигурации, которые создаются ТОЛЬКО если отсутствуют (чтобы сохранить кастомные настройки)
    const preserveExistingConfigs = [
        { src: path.join(__dirname, 'configs', 'budget-exceptions.json'), dest: path.join(resolvedTarget, 'configs', 'budget-exceptions.json'), label: 'Budget Exceptions Registry' },
        { src: path.join(__dirname, 'configs', 'knip.json'), dest: path.join(resolvedTarget, 'knip.json'), label: 'Knip Dead Code Config' },
        { src: path.join(__dirname, 'configs', 'tsconfig.test.json'), dest: path.join(resolvedTarget, 'tsconfig.test.json'), label: 'TypeScript Test Config' },
        { src: path.join(__dirname, 'test', 'setup.ts'), dest: path.join(resolvedTarget, 'src', 'test', 'setup.ts'), label: 'Hermetic Test Setup' },
        { src: path.join(__dirname, 'utils', 'security.ts'), dest: path.join(resolvedTarget, 'src', 'utils', 'security.ts'), label: 'Security Sanitizers' }
    ];

    for (const cfg of preserveExistingConfigs) {
        if (fs.existsSync(cfg.src) && !fs.existsSync(cfg.dest)) {
            fs.mkdirSync(path.dirname(cfg.dest), { recursive: true });
            fs.copyFileSync(cfg.src, cfg.dest);
            updatedFilesCount++;
            console.log(`  ⚙️ Установлен новый конфиг: ${path.relative(resolvedTarget, cfg.dest)} (${cfg.label})`);
        }
    }

    // 6. Актуализируем документацию харнесса (docs/AI_HARNESS_GUIDE.md)
    const guideSrc = path.join(__dirname, 'docs', 'AI_HARNESS_GUIDE.md');
    const guideDest = path.join(resolvedTarget, 'docs', 'AI_HARNESS_GUIDE.md');
    if (fs.existsSync(guideSrc)) {
        fs.mkdirSync(path.dirname(guideDest), { recursive: true });
        fs.copyFileSync(guideSrc, guideDest);
        updatedFilesCount++;
        console.log(`  📚 Актуализирован справочник харнесса: docs/AI_HARNESS_GUIDE.md (v1.1.0)`);
    }

    // 7. Накатываем новые архитектурные решения (ADR), сохраняя существующие
    const decSrcDir = path.join(__dirname, 'templates', 'planning', 'decisions');
    const decTargetDir = path.join(resolvedTarget, '.planning', 'decisions');
    fs.mkdirSync(decTargetDir, { recursive: true });

    if (fs.existsSync(decSrcDir)) {
        const decFiles = fs.readdirSync(decSrcDir);
        for (const decFile of decFiles) {
            const srcPath = path.join(decSrcDir, decFile);
            const destPath = path.join(decTargetDir, decFile);
            if (!fs.existsSync(destPath)) {
                fs.copyFileSync(srcPath, destPath);
                updatedFilesCount++;
                console.log(`  🏛 Установлено новое архитектурное решение: .planning/decisions/${decFile}`);
            }
        }
    }

    // 8. Обновляем правила в .agents/rules/folder-scoped/
    const scopedSrc = path.join(__dirname, 'templates', 'rules', 'scoped');
    const scopedDest = path.join(resolvedTarget, '.agents', 'rules', 'folder-scoped');
    if (fs.existsSync(scopedSrc)) {
        const copied = copyDirectoryOverwrite(scopedSrc, scopedDest);
        updatedFilesCount += copied;
        console.log(`  📂 Актуализированы scoped-правила: .agents/rules/folder-scoped/ (${copied} файлов)`);
    }

    // 9. Безопасно обновляем package.json (подмешиваем новые скрипты харнесса)
    const pkgRaw = fs.readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(pkgRaw);
    pkg.scripts = pkg.scripts || {};

    const requiredScripts = {
        'check:component-budget': 'node scripts/verify-component-budget.mjs',
        'check:circular': 'node scripts/verify-no-circular.mjs',
        'check:hygiene': 'node scripts/verify-resource-hygiene.mjs',
        'check:memo': 'node scripts/verify-memoization.mjs',
        'check:security:antipatterns': 'node scripts/verify-security-antipatterns.mjs',
        'check:design': 'node scripts/verify-design-system.mjs',
        'verify:remote': 'node scripts/verify-remote-ci.mjs',
        'push:verify': 'node scripts/verify-remote-ci.mjs --push',
        'test:flaky': 'node scripts/test-flaky.mjs'
    };

    let scriptsAdded = 0;
    for (const [key, val] of Object.entries(requiredScripts)) {
        if (!pkg.scripts[key]) {
            pkg.scripts[key] = val;
            scriptsAdded++;
            console.log(`  ➕ Добавлен npm script: "${key}": "${val}"`);
        }
    }

    if (scriptsAdded > 0) {
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
        console.log(`  📝 package.json обновлен (+${scriptsAdded} скриптов).`);
    }

    // 10. Проверяем .gitignore на изоляцию секретов
    const gitignorePath = path.join(resolvedTarget, '.gitignore');
    const requiredIgnores = ['.env', '.env.local', '.dev.vars', '.ci-verified.json'];
    if (fs.existsSync(gitignorePath)) {
        let giContent = fs.readFileSync(gitignorePath, 'utf-8');
        let ignoresAdded = 0;
        for (const item of requiredIgnores) {
            if (!giContent.includes(item)) {
                giContent += `\n${item}`;
                ignoresAdded++;
            }
        }
        if (ignoresAdded > 0) {
            fs.writeFileSync(gitignorePath, giContent + '\n', 'utf-8');
            console.log(`  🛡️ .gitignore: добавлено ${ignoresAdded} правил защиты секретов.`);
        }
    }

    // 11. Проверка синхронизации AGENTS.md
    const agentsPath = path.join(resolvedTarget, 'AGENTS.md');
    if (fs.existsSync(agentsPath)) {
        const agentsContent = fs.readFileSync(agentsPath, 'utf-8');
        if (!agentsContent.includes('D-04') && !agentsContent.includes('COMPONENT ARCHITECTURE')) {
            console.log(`  ⚠️ Внимание: В ${path.relative(process.cwd(), agentsPath)} не найдено упоминание ADR D-04 (лимиты 150–250 строк).`);
            console.log(`     Рекомендуется обновить раздел правил из: rules/AGENTS_HARNESS_SNIPPET.md`);
        } else {
            console.log(`  ✅ Корневой AGENTS.md содержит правила архитектуры компонентов.`);
        }
    }

    console.log('='.repeat(70));
    console.log(`✅ Проект "${path.basename(resolvedTarget)}" успешно обновлен до стандарта v1.1.0!`);
    console.log(`   Обновлено/создано элементов: ${updatedFilesCount + scriptsAdded}`);
    console.log('='.repeat(70) + '\n');
    return true;
}

// Поиск соседних проектов в родительской директории
function discoverSiblingProjects() {
    const parentDir = path.resolve(__dirname, '..');
    const currentRepoName = path.basename(__dirname);
    const projects = [];

    try {
        const entries = fs.readdirSync(parentDir, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === currentRepoName || entry.name === 'node_modules') {
                continue;
            }
            const candidatePath = path.join(parentDir, entry.name);
            const candidatePkg = path.join(candidatePath, 'package.json');
            if (fs.existsSync(candidatePkg)) {
                let hasHarness = fs.existsSync(path.join(candidatePath, 'scripts', 'verify-diff-budget.mjs')) ||
                                 fs.existsSync(path.join(candidatePath, '.husky')) ||
                                 fs.existsSync(path.join(candidatePath, 'AGENTS.md'));
                projects.push({
                    name: entry.name,
                    path: candidatePath,
                    hasHarness
                });
            }
        }
    } catch (err) {
        // Если доступ к родительской папке ограничен
    }

    return projects;
}

// Главная точка входа
async function main() {
    const args = process.argv.slice(2);

    // Вариант 1: передан флаг --all (обновить все найденные проекты)
    if (args.includes('--all')) {
        const projects = discoverSiblingProjects();
        if (projects.length === 0) {
            console.log('❌ Соседних проектов с package.json в родительской папке не обнаружено.');
            process.exit(1);
        }
        console.log(`🚀 Запуск массового обновления ${projects.length} проектов...\n`);
        for (const p of projects) {
            upgradeProject(p.path);
        }
        console.log('🎉 Все проекты успешно обновлены!');
        process.exit(0);
    }

    // Вариант 2: передан конкретный путь к проекту (node update.mjs /path/to/project)
    if (args.length > 0 && !args[0].startsWith('-')) {
        const targetPath = path.resolve(args[0]);
        const success = upgradeProject(targetPath);
        process.exit(success ? 0 : 1);
    }

    // Вариант 3: Интерактивный режим выбора проекта
    const projects = discoverSiblingProjects();
    if (projects.length === 0) {
        console.log('\nИспользование:');
        console.log('  node update.mjs <путь_к_проекту>   - обновить указанный проект');
        console.log('  node update.mjs --all              - обновить все проекты в родительской папке');
        process.exit(0);
    }

    console.log('\n' + '='.repeat(70));
    console.log('🚀 [AI Yak Harness Project Updater]');
    console.log(`📁 Найдено проектов в родительской директории: ${projects.length}`);
    console.log('='.repeat(70));

    projects.forEach((p, idx) => {
        const status = p.hasHarness ? '🛡️  Harness подключен' : '✨ Новый проект (без харнесса)';
        console.log(`  [${idx + 1}] ${p.name.padEnd(25)} (${status})`);
    });
    console.log(`  [A] Обновить ВСЕ ${projects.length} проектов сразу`);
    console.log(`  [Q] Выход`);
    console.log('='.repeat(70));

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('\n👉 Выберите номер проекта (1-' + projects.length + '), [A] для всех или [Q]: ', (answer) => {
        rl.close();
        const trimmed = answer.trim().toUpperCase();

        if (trimmed === 'Q' || !trimmed) {
            console.log('Отменено.');
            process.exit(0);
        }

        if (trimmed === 'A') {
            console.log(`\n🚀 Запуск обновления всех ${projects.length} проектов...\n`);
            for (const p of projects) {
                upgradeProject(p.path);
            }
            console.log('🎉 Все проекты успешно обновлены!');
            process.exit(0);
        }

        const selectedIndex = parseInt(trimmed, 10) - 1;
        if (selectedIndex >= 0 && selectedIndex < projects.length) {
            upgradeProject(projects[selectedIndex].path);
        } else {
            console.log('❌ Неверный номер проекта.');
            process.exit(1);
        }
    });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
}
