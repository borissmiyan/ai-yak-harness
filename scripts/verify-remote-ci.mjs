#!/usr/bin/env node
import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * 🛡️ Remote CI Quality Gate Verifier (Tier-1 AI Harness Enforcement)
 * 
 * Автоматически отслеживает, блокирует и верифицирует удаленный прогон
 * GitHub Actions CI Quality Gate для текущего коммита.
 * 
 * Гарантирует, что ни человек, ни ИИ-ассистент не смогут заявить
 * о готовности задачи, пока GitHub Actions не вернет статус "success".
 * 
 * Использование:
 *   npm run verify:remote        - проверяет CI для текущего коммита
 *   npm run push:verify          - отправляет в origin и сразу ждет CI
 */

function runCommand(cmd) {
    try {
        return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    } catch {
        return '';
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    const shouldPush = process.argv.includes('--push');

    console.log('\n' + '='.repeat(68));
    console.log('🛡️ [Remote CI Quality Gate] Проверка удаленного статуса GitHub Actions');
    console.log('='.repeat(68));

    // 1. Проверяем наличие GitHub CLI
    const ghVersion = runCommand('gh --version');
    if (!ghVersion) {
        console.error('❌ Ошибка: GitHub CLI (`gh`) не установлен в системе.');
        console.error('Установите gh (brew install gh) и авторизуйтесь (gh auth login).');
        process.exit(1);
    }

    // 2. Получаем текущую ветку и хэш коммита
    const branch = runCommand('git branch --show-current');
    const headSha = runCommand('git rev-parse HEAD');
    const shortSha = headSha.slice(0, 7);

    if (!branch) {
        console.error('❌ Ошибка: Не удалось определить текущую git-ветку (detached HEAD?).');
        process.exit(1);
    }

    console.log(`📌 Ветка: ${branch}`);
    console.log(`📌 Коммит: ${shortSha} (${headSha})`);

    // 3. Если передан флаг --push, выполняем git push origin <branch>
    if (shouldPush) {
        console.log(`\n🚀 Отправляю изменения в origin/${branch}...`);
        const pushResult = spawnSync('git', ['push', 'origin', branch], { stdio: 'inherit' });
        if (pushResult.status !== 0) {
            console.error(`\n❌ Ошибка: 'git push origin ${branch}' завершился неудачно.`);
            process.exit(pushResult.status || 1);
        }
    } else {
        // Проверяем, что локальный коммит отправлен в origin
        const remoteSha = runCommand(`git rev-parse origin/${branch} 2>/dev/null`);
        if (remoteSha !== headSha) {
            console.error(`\n⚠️ Внимание: Локальный коммит ${shortSha} еще не отправлен в origin/${branch}.`);
            console.error(`Сначала выполните: git push origin ${branch}`);
            console.error(`Или запустите сразу: npm run push:verify`);
            process.exit(1);
        }
    }

    // 4. Опрашиваем GitHub Actions API в поисках запуска для headSha
    console.log(`\n⏳ Поиск запуска CI Quality Gate для коммита ${shortSha}...`);
    let targetRun = null;
    const startTime = Date.now();
    const timeoutMs = 90000; // 90 секунд таймаут на появление запуска в очереди

    while (Date.now() - startTime < timeoutMs) {
        const runsJson = runCommand(
            `gh run list --branch ${branch} --limit 10 --json databaseId,headSha,status,conclusion,workflowName,url`
        );

        if (runsJson) {
            try {
                const runs = JSON.parse(runsJson);
                targetRun = runs.find(
                    (r) => r.headSha === headSha && (r.workflowName === 'CI Quality Gate' || !r.workflowName)
                );
                if (targetRun) break;
            } catch {
                /* игнорируем ошибку парсинга промежуточного вывода */
            }
        }

        process.stdout.write(`⏳ Ожидаю регистрацию workflow run в GitHub Actions... (${Math.round((Date.now() - startTime) / 1000)}с)\r`);
        await sleep(3500);
    }

    console.log(''); // перенос строки

    if (!targetRun) {
        console.error(`\n❌ Ошибка: Запуск CI Quality Gate для коммита ${shortSha} не найден в течение 90 секунд.`);
        console.error('Проверьте подключение к GitHub или статус https://github.com/borissmiyan/ai-yak-harness/actions');
        process.exit(1);
    }

    console.log(`🔗 Найдено событие CI: ID ${targetRun.databaseId}`);
    console.log(`🌐 Ссылка: ${targetRun.url}`);
    console.log(`📊 Текущий статус: ${targetRun.status} (${targetRun.conclusion || 'в процессе'})\n`);

    // 5. Если запуск еще выполняется, подключаемся к live-stream через `gh run watch`
    if (targetRun.status !== 'completed') {
        console.log('📡 Подключаюсь к онлайн-мониторингу раннера GitHub Actions (gh run watch)...');
        const watchResult = spawnSync('gh', ['run', 'watch', String(targetRun.databaseId), '--exit-status'], {
            stdio: 'inherit',
        });

        if (watchResult.status !== 0) {
            console.error(`\n❌ [CI Quality Gate] Удаленный CI завершился с ошибкой!`);
            console.log('\n📄 Логи упавшего шага:');
            spawnSync('gh', ['run', 'view', String(targetRun.databaseId), '--log-failed'], { stdio: 'inherit' });
            process.exit(watchResult.status || 1);
        }
    }

    // 6. Финальное подтверждение статуса через API
    const finalRunJson = runCommand(`gh run view ${targetRun.databaseId} --json status,conclusion,url`);
    let isSuccess = false;
    try {
        const finalRun = JSON.parse(finalRunJson);
        isSuccess = finalRun.conclusion === 'success';
    } catch {
        isSuccess = targetRun.conclusion === 'success';
    }

    if (!isSuccess) {
        console.error(`\n❌ [CI Quality Gate] Запуск ${targetRun.databaseId} не прошел (conclusion !== 'success').`);
        console.log('\n📄 Логи упавшего шага:');
        spawnSync('gh', ['run', 'view', String(targetRun.databaseId), '--log-failed'], { stdio: 'inherit' });
        process.exit(1);
    }

    // 7. Формируем локальный проверочный штамп
    const stampFile = path.resolve(process.cwd(), '.ci-verified.json');
    const stampData = {
        branch,
        commit: headSha,
        runId: targetRun.databaseId,
        url: targetRun.url,
        status: 'success',
        verifiedAt: new Date().toISOString(),
    };

    try {
        fs.writeFileSync(stampFile, JSON.stringify(stampData, null, 2), 'utf-8');
    } catch {
        /* игнорируем ошибку записи штампа */
    }

    console.log('\n' + '='.repeat(68));
    console.log('🎉 [CI Quality Gate] УДАЛЕННЫЙ CI УСПЕШНО ПРОЙДЕН!');
    console.log('='.repeat(68));
    console.log(`✅ Статус: SUCCESS`);
    console.log(`✅ Коммит: ${shortSha}`);
    console.log(`✅ Run ID: ${targetRun.databaseId}`);
    console.log(`✅ Штамп верификации сохранен в .ci-verified.json`);
    console.log('='.repeat(68) + '\n');

    process.exit(0);
}

main().catch((err) => {
    console.error('Непредвиденная ошибка в verify-remote-ci:', err);
    process.exit(1);
});
