#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

/**
 * 🚀 AI Yak Harness Universal Installer & Project Synchronizer (v1.2.0)
 * 
 * Единый инструмент установки и автоматического обновления инженерного контура:
 * - Установка с нуля: подключает 9 столпов качества, документацию, ADR и скиллы.
 * - Безопасное обновление: актуализирует скрипты, хуки, правила линтера и ADR D-04,
 *   сохраняя CONTEXT.md, USER_PROFILE.md, project-rules.md, COMPONENTS.md и исключения.
 * 
 * Использование:
 *   node setup.mjs                     - интерактивный выбор проекта (ввод номера + Enter)
 *   node setup.mjs <путь_к_проекту>    - установка/обновление указанного проекта
 *   node setup.mjs --all               - обновление всех проектов в родительской директории
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Рекурсивное копирование директории с перезаписью
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

// Проверка: установлен ли харнесс в проекте
export function hasHarnessInstalled(targetDir) {
    return fs.existsSync(path.join(targetDir, 'scripts', 'verify-diff-budget.mjs')) ||
           fs.existsSync(path.join(targetDir, '.husky', 'pre-commit')) ||
           fs.existsSync(path.join(targetDir, 'configs', 'harness-limits.json')) ||
           fs.existsSync(path.join(targetDir, 'AGENTS.md'));
}

// Поиск соседних проектов в родительской директории
export function discoverSiblingProjects() {
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
                projects.push({
                    name: entry.name,
                    path: candidatePath,
                    hasHarness: hasHarnessInstalled(candidatePath)
                });
            }
        }
    } catch {
        // Доступ к родительской папке ограничен
    }

    return projects;
}

// Установка или обновление одного проекта
export function installOrUpdateProject(targetDir) {
    const resolvedTarget = path.resolve(targetDir);
    const isUpdate = hasHarnessInstalled(resolvedTarget);
    const actionLabel = isUpdate ? 'Обновление' : 'Первичная установка';
    const actionIcon = isUpdate ? '🔄' : '🚀';

    console.log('\n' + '='.repeat(70));
    console.log(`${actionIcon} [AI Yak Harness] ${actionLabel}: ${path.basename(resolvedTarget)}`);
    console.log(`📁 Директория: ${resolvedTarget}`);
    console.log('='.repeat(70));

    const pkgPath = path.join(resolvedTarget, 'package.json');
    if (!fs.existsSync(pkgPath)) {
        console.error(`❌ Ошибка: В директории ${resolvedTarget} не найден package.json!`);
        return false;
    }

    let modifiedElements = 0;

    // 1. Создаем необходимые директории
    const dirsToCreate = [
        path.join(resolvedTarget, 'scripts'),
        path.join(resolvedTarget, '.husky'),
        path.join(resolvedTarget, '.github', 'workflows'),
        path.join(resolvedTarget, '.planning', 'decisions'),
        path.join(resolvedTarget, '.agents', 'skills'),
        path.join(resolvedTarget, '.agents', 'rules'),
        path.join(resolvedTarget, '.agents', 'rules', 'folder-scoped'),
        path.join(resolvedTarget, 'src', 'test'),
        path.join(resolvedTarget, 'src', 'utils'),
        path.join(resolvedTarget, 'e2e'),
        path.join(resolvedTarget, 'configs'),
        path.join(resolvedTarget, 'docs')
    ];

    for (const dir of dirsToCreate) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    // 2. Изоляция секретов в .gitignore
    const gitignorePath = path.join(resolvedTarget, '.gitignore');
    const requiredIgnores = [
        '.env',
        '.env.local',
        '.env.*.local',
        '.dev.vars',
        '.ci-verified.json',
        '*.pem',
        '*.key'
    ];
    if (fs.existsSync(gitignorePath)) {
        let giContent = fs.readFileSync(gitignorePath, 'utf-8');
        let added = 0;
        for (const item of requiredIgnores) {
            if (!giContent.includes(item)) {
                giContent += `\n${item}`;
                added++;
            }
        }
        if (added > 0) {
            fs.writeFileSync(gitignorePath, giContent + '\n', 'utf-8');
            console.log(`  🛡️ [Gitignore Guard] Добавлено ${added} защитных правил для секретов в .gitignore.`);
            modifiedElements += added;
        }
    }

    // 3. Проверочные скрипты верификации (scripts/) — всегда обновляются
    const scriptsSrc = path.join(__dirname, 'scripts');
    const scriptsDest = path.join(resolvedTarget, 'scripts');
    if (fs.existsSync(scriptsSrc)) {
        const count = copyDirectoryOverwrite(scriptsSrc, scriptsDest);
        modifiedElements += count;
        console.log(`  📜 ${isUpdate ? 'Обновлены' : 'Установлены'} проверочные скрипты: scripts/ (${count} файлов)`);
    }

    // 4. Git-хуки (.husky/) — всегда обновляются в fail-closed
    const hooksSrc = path.join(__dirname, 'hooks');
    const hooksDest = path.join(resolvedTarget, '.husky');
    if (fs.existsSync(hooksSrc)) {
        const count = copyDirectoryOverwrite(hooksSrc, hooksDest);
        modifiedElements += count;
        console.log(`  🪝 ${isUpdate ? 'Обновлены' : 'Установлены'} Git-хуки: .husky/ (${count} файлов, режим fail-closed)`);
    }

    // 5. GitHub Actions Workflow — всегда обновляется
    const ciSrc = path.join(__dirname, 'ci', 'ci-quality-gate.yml');
    const ciDest = path.join(resolvedTarget, '.github', 'workflows', 'ci-quality-gate.yml');
    if (fs.existsSync(ciSrc)) {
        fs.mkdirSync(path.dirname(ciDest), { recursive: true });
        fs.copyFileSync(ciSrc, ciDest);
        modifiedElements++;
        console.log(`  🤖 ${isUpdate ? 'Обновлен' : 'Установлен'} CI Quality Gate: .github/workflows/ci-quality-gate.yml`);
    }

    // 6. ИИ-скиллы (.agents/skills/) — всегда обновляются
    const skillsSrc = path.join(__dirname, 'skills');
    const skillsDest = path.join(resolvedTarget, '.agents', 'skills');
    if (fs.existsSync(skillsSrc)) {
        const count = copyDirectoryOverwrite(skillsSrc, skillsDest);
        modifiedElements += count;
        console.log(`  🧠 ${isUpdate ? 'Обновлены' : 'Установлены'} скиллы агента: .agents/skills/ (${count} файлов)`);
    }

    // 7. Конфигурационные файлы харнесса (configs/)
    const alwaysUpdateConfigs = [
        { src: path.join(__dirname, 'configs', 'harness-limits.json'), dest: path.join(resolvedTarget, 'configs', 'harness-limits.json'), label: 'Harness Limits Manifest (D-04)' },
        { src: path.join(__dirname, 'configs', 'eslint.config.harness.js'), dest: path.join(resolvedTarget, 'configs', 'eslint.config.harness.js'), label: 'ESLint AST Harness Rules' },
        { src: path.join(__dirname, 'configs', 'stryker.config.mjs'), dest: path.join(resolvedTarget, 'stryker.config.mjs'), label: 'Stryker Config' },
        { src: path.join(__dirname, 'configs', '.auditrc.json'), dest: path.join(resolvedTarget, '.auditrc.json'), label: 'Codebase Audit Config' }
    ];

    for (const cfg of alwaysUpdateConfigs) {
        if (fs.existsSync(cfg.src)) {
            fs.mkdirSync(path.dirname(cfg.dest), { recursive: true });
            fs.copyFileSync(cfg.src, cfg.dest);
            modifiedElements++;
            console.log(`  ⚙️ ${isUpdate ? 'Обновлен' : 'Установлен'} конфиг: ${path.relative(resolvedTarget, cfg.dest)} (${cfg.label})`);
        }
    }

    const preserveExistingConfigs = [
        { src: path.join(__dirname, 'configs', 'budget-exceptions.json'), dest: path.join(resolvedTarget, 'configs', 'budget-exceptions.json'), label: 'Budget Exceptions Registry' },
        { src: path.join(__dirname, 'configs', 'knip.json'), dest: path.join(resolvedTarget, 'knip.json'), label: 'Knip Config' },
        { src: path.join(__dirname, 'configs', 'tsconfig.test.json'), dest: path.join(resolvedTarget, 'tsconfig.test.json'), label: 'TypeScript Test Config' },
        { src: path.join(__dirname, 'test', 'setup.ts'), dest: path.join(resolvedTarget, 'src', 'test', 'setup.ts'), label: 'Hermetic Test Setup' },
        { src: path.join(__dirname, 'utils', 'security.ts'), dest: path.join(resolvedTarget, 'src', 'utils', 'security.ts'), label: 'Security Sanitizers' }
    ];

    for (const cfg of preserveExistingConfigs) {
        if (fs.existsSync(cfg.src) && !fs.existsSync(cfg.dest)) {
            fs.mkdirSync(path.dirname(cfg.dest), { recursive: true });
            fs.copyFileSync(cfg.src, cfg.dest);
            modifiedElements++;
            console.log(`  ⚙️ Установлен конфиг: ${path.relative(resolvedTarget, cfg.dest)} (${cfg.label})`);
        }
    }

    // 8. Справочник харнесса (docs/AI_HARNESS_GUIDE.md) — всегда актуализируется
    const harnessGuideSrc = path.join(__dirname, 'docs', 'AI_HARNESS_GUIDE.md');
    const harnessGuideDest = path.join(resolvedTarget, 'docs', 'AI_HARNESS_GUIDE.md');
    if (fs.existsSync(harnessGuideSrc)) {
        fs.mkdirSync(path.dirname(harnessGuideDest), { recursive: true });
        fs.copyFileSync(harnessGuideSrc, harnessGuideDest);
        modifiedElements++;
        console.log(`  📚 ${isUpdate ? 'Актуализирован' : 'Установлен'} справочник: docs/AI_HARNESS_GUIDE.md (v1.2.0)`);
    }

    // 9. Архитектурные решения (ADR)
    const planningSrcDir = path.join(__dirname, 'templates', 'planning');
    if (fs.existsSync(planningSrcDir)) {
        // CONTEXT.md устанавливается ТОЛЬКО если отсутствует
        const contextSrc = path.join(planningSrcDir, 'CONTEXT.md');
        const contextDest = path.join(resolvedTarget, '.planning', 'CONTEXT.md');
        if (!fs.existsSync(contextDest) && fs.existsSync(contextSrc)) {
            fs.copyFileSync(contextSrc, contextDest);
            modifiedElements++;
            console.log(`  📑 Создан архитектурный контекст: .planning/CONTEXT.md`);
        }

        const templateSrc = path.join(planningSrcDir, 'decisions', 'TEMPLATE.md');
        const templateDest = path.join(resolvedTarget, '.planning', 'decisions', 'TEMPLATE.md');
        if (!fs.existsSync(templateDest) && fs.existsSync(templateSrc)) {
            fs.copyFileSync(templateSrc, templateDest);
            modifiedElements++;
        }

        const decSrcDir = path.join(planningSrcDir, 'decisions');
        if (fs.existsSync(decSrcDir)) {
            const decFiles = fs.readdirSync(decSrcDir);
            for (const decFile of decFiles) {
                if (decFile === 'TEMPLATE.md') continue;
                const srcPath = path.join(decSrcDir, decFile);
                const destPath = path.join(resolvedTarget, '.planning', 'decisions', decFile);
                if (!fs.existsSync(destPath)) {
                    fs.copyFileSync(srcPath, destPath);
                    modifiedElements++;
                    console.log(`  🏛 Установлено архитектурное решение: .planning/decisions/${decFile}`);
                }
            }
        }
    }

    // 10. Персональные шаблоны (USER_PROFILE, project-rules, PURPOSE, COMPONENTS) — сохраняются
    const userProfileSrc = path.join(__dirname, "templates", "USER_PROFILE.TEMPLATE.md");
    const userProfileDest = path.join(resolvedTarget, ".agents", "USER_PROFILE.md");
    if (fs.existsSync(userProfileSrc) && !fs.existsSync(userProfileDest)) {
        fs.copyFileSync(userProfileSrc, userProfileDest);
        modifiedElements++;
        console.log("  👤 Установлен профиль разработчика: .agents/USER_PROFILE.md");
    }

    const projectRulesSrc = path.join(__dirname, "templates", "rules", "project-rules.TEMPLATE.md");
    const projectRulesDest = path.join(resolvedTarget, ".agents", "rules", "project-rules.md");
    if (fs.existsSync(projectRulesSrc) && !fs.existsSync(projectRulesDest)) {
        fs.copyFileSync(projectRulesSrc, projectRulesDest);
        modifiedElements++;
        console.log("  ⚡ Установлены правила проекта: .agents/rules/project-rules.md");
    }

    const docsSrcDir = path.join(__dirname, 'templates', 'docs');
    if (fs.existsSync(docsSrcDir)) {
        const docFiles = [
            { file: 'PURPOSE.md', label: 'Product Mission & Scope' },
            { file: 'DESIGN-AI.md', label: 'Machine-Readable Design Tokens' },
            { file: 'COMPONENTS.md', label: 'Component Registry' },
            { file: 'ANTIPATTERNS.md', label: 'Forbidden Antipatterns' }
        ];

        for (const { file, label } of docFiles) {
            const srcPath = path.join(docsSrcDir, file);
            const destPath = path.join(resolvedTarget, file);
            if (fs.existsSync(srcPath) && !fs.existsSync(destPath)) {
                fs.copyFileSync(srcPath, destPath);
                modifiedElements++;
                console.log(`  📋 Установлен реестр: ${file} (${label})`);
            }
        }
    }

    // 11. Folder-Scoped правила (.agents/rules/folder-scoped/) — актуализируются
    const scopedRulesSrc = path.join(__dirname, 'templates', 'rules', 'scoped');
    if (fs.existsSync(scopedRulesSrc)) {
        const scopedDest = path.join(resolvedTarget, '.agents', 'rules', 'folder-scoped');
        const count = copyDirectoryOverwrite(scopedRulesSrc, scopedDest);
        modifiedElements += count;
        console.log(`  📂 Актуализированы scoped-правила: .agents/rules/folder-scoped/ (${count} файлов)`);
    }

    // 12. Безопасно обновляем package.json (подмешиваем новые скрипты)
    const pkgRaw = fs.readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(pkgRaw);
    pkg.scripts = pkg.scripts || {};

    const harnessScripts = {
        'check:types': 'tsc -b || tsc --noEmit',
        'check:circular': 'node scripts/verify-no-circular.mjs',
        'check:hygiene': 'node scripts/verify-resource-hygiene.mjs',
        'check:memo': 'node scripts/verify-memoization.mjs',
        'check:design': 'node scripts/verify-design-system.mjs',
        'check:security:antipatterns': 'node scripts/verify-security-antipatterns.mjs',
        'check:dead-code': 'knip',
        'check:schema-drift': 'node scripts/verify-schema-drift.mjs',
        'check:debug-leftovers': 'node scripts/verify-no-debug-leftovers.mjs',
        'check:large-files': 'node scripts/verify-no-large-files.mjs',
        'check:component-budget': 'node scripts/verify-component-budget.mjs',
        'test:flaky': 'node scripts/test-flaky.mjs',
        'test:mutate': 'stryker run',
        'check:security:snyk': 'snyk test',
        'verify:remote': 'node scripts/verify-remote-ci.mjs',
        'push:verify': 'node scripts/verify-remote-ci.mjs --push',
        'prepare': 'husky'
    };

    let scriptsAdded = 0;
    for (const [key, value] of Object.entries(harnessScripts)) {
        if (!pkg.scripts[key]) {
            pkg.scripts[key] = value;
            scriptsAdded++;
            console.log(`  ➕ Добавлен npm script: "${key}": "${value}"`);
        }
    }

    if (!pkg.scripts.check) {
        pkg.scripts.check = 'tsc --noEmit && eslint src && vitest run';
        scriptsAdded++;
        console.log(`  ➕ Сформирован базовый unified check: "check": "${pkg.scripts.check}"`);
    }

    if (!pkg['lint-staged']) {
        pkg['lint-staged'] = {
            '*.{ts,tsx}': ['eslint --fix', 'vitest related --run']
        };
        scriptsAdded++;
        console.log('  ➕ Добавлена секция "lint-staged" для быстрой валидации измененных файлов.');
    }

    if (scriptsAdded > 0) {
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
        console.log(`  📝 Обновлен package.json (+${scriptsAdded} параметров).`);
        modifiedElements += scriptsAdded;
    }

    // 13. Корневой файл правил AGENTS.md
    const agentsRulePath = path.join(resolvedTarget, 'AGENTS.md');
    const snippetSource = path.join(__dirname, 'rules', 'AGENTS_HARNESS_SNIPPET.md');

    if (!fs.existsSync(agentsRulePath) && fs.existsSync(snippetSource)) {
        fs.copyFileSync(snippetSource, agentsRulePath);
        modifiedElements++;
        console.log(`  📋 Создан корневой файл правил для ИИ: AGENTS.md`);
    } else if (fs.existsSync(agentsRulePath)) {
        const agentsContent = fs.readFileSync(agentsRulePath, 'utf-8');
        if (!agentsContent.includes('D-04') && !agentsContent.includes('COMPONENT ARCHITECTURE')) {
            console.log(`  ⚠️ Внимание: В ${path.relative(process.cwd(), agentsRulePath)} не найдено упоминание ADR D-04 (лимиты 150–250 строк).`);
            console.log(`     Рекомендуется обновить раздел правил из: rules/AGENTS_HARNESS_SNIPPET.md`);
        } else {
            console.log(`  ✅ Корневой AGENTS.md содержит правила архитектуры компонентов.`);
        }
    }

    console.log('\n' + '='.repeat(70));
    console.log(`✅ Проект "${path.basename(resolvedTarget)}" успешно ${isUpdate ? 'обновлен' : 'инициализирован'}! (Всего изменений: ${modifiedElements})`);
    console.log('='.repeat(70));
    return true;
}

// Интерактивное меню выбора проектов
function runInteractiveMenu(projects) {
    console.log('\n' + '='.repeat(70));
    console.log('🚀 [AI Yak Harness Universal Manager]');
    console.log(`📁 Найдено проектов в родительской директории: ${projects.length}`);
    console.log('='.repeat(70));

    projects.forEach((p, idx) => {
        const status = p.hasHarness ? '🛡️  Harness подключен -> Обновить' : '✨ Новый проект -> Установить';
        console.log(`  [${idx + 1}] ${p.name.padEnd(25)} (${status})`);
    });
    console.log(`  [A] Обработать ВСЕ ${projects.length} проектов сразу`);
    console.log(`  [Q] Выход`);
    console.log('='.repeat(70));

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('\n💡 Совет: Можно указать один номер (напр. 10) или несколько через пробел/запятую (напр. 7 10 14).');
    rl.question('👉 Введите номер(а) проекта, [A] или [Q] и нажмите Enter: ', (answer) => {
        rl.close();
        const trimmed = answer.trim();

        if (trimmed.toUpperCase() === 'Q' || !trimmed) {
            console.log('Отменено.');
            process.exit(0);
        }

        if (trimmed.toUpperCase() === 'A') {
            console.log(`\n🚀 Запуск обработки всех ${projects.length} проектов...\n`);
            let successCount = 0;
            for (const p of projects) {
                if (installOrUpdateProject(p.path)) successCount++;
            }
            console.log(`\n🎉 Обработка завершена! Успешно обновлено проектов: ${successCount} из ${projects.length}`);
            process.exit(0);
        }

        // Парсинг чисел, разделенных пробелами или запятыми
        const tokens = trimmed.split(/[\s,]+/).filter(Boolean);
        const selectedProjects = [];

        for (const token of tokens) {
            const num = parseInt(token, 10);
            if (!isNaN(num) && num >= 1 && num <= projects.length) {
                const proj = projects[num - 1];
                if (!selectedProjects.includes(proj)) {
                    selectedProjects.push(proj);
                }
            } else {
                console.warn(`⚠️ Пропущен неверный номер: "${token}"`);
            }
        }

        if (selectedProjects.length === 0) {
            console.log('❌ Не выбрано ни одного корректного проекта.');
            process.exit(1);
        }

        console.log(`\n🚀 Запуск обработки ${selectedProjects.length} выбранных проектов...\n`);
        let successCount = 0;
        for (const p of selectedProjects) {
            if (installOrUpdateProject(p.path)) successCount++;
        }
        console.log(`\n🎉 Успешно завершено! Обработано проектов: ${successCount} из ${selectedProjects.length}`);
        process.exit(0);
    });
}

// Главная точка запуска
export function main() {
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
            installOrUpdateProject(p.path);
        }
        console.log('🎉 Все проекты успешно обновлены!');
        process.exit(0);
    }

    // Вариант 2: передан путь к проекту (node setup.mjs /path/to/project)
    if (args.length > 0 && !args[0].startsWith('-')) {
        const targetDir = path.resolve(args[0]);
        const success = installOrUpdateProject(targetDir);
        process.exit(success ? 0 : 1);
    }

    // Вариант 3: Запуск без параметров
    const isInsideHarnessRoot = (path.resolve(process.cwd()) === __dirname);
    const projects = discoverSiblingProjects();

    if (isInsideHarnessRoot && projects.length > 0) {
        // Если запускают прямо из репозитория харнесса — выводим интерактивное меню выбора
        runInteractiveMenu(projects);
    } else {
        // Если запускают внутри целевого проекта без параметров — устанавливаем/обновляем в текущую директорию
        const targetDir = process.cwd();
        const success = installOrUpdateProject(targetDir);
        process.exit(success ? 0 : 1);
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
}
