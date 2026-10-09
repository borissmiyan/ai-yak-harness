#!/usr/bin/env node
import { spawnSync, execSync } from 'child_process';

function runCommand(cmd) {
    try {
        return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    } catch {
        return '';
    }
}

/**
 * 🔄 Circular Dependency Guard (Tier-3 AI Harness Gate)
 * 
 * Предотвращает появление циклических зависимостей в архитектуре проекта.
 * Циклические импорты приводят к трудноуловимым багам инициализации в рантайме (undefined imports),
 * утечкам памяти и проблемам сборки бандла Rollup/Vite.
 * 
 * Если в критической ситуации требуется временный байпас:
 * Запустите с флагом: ALLOW_CIRCULAR=true git commit ...
 */

function verifyNoCircular() {
    const commitMsg = runCommand('git log -1 --pretty=%B');
    if (
        process.env.ALLOW_CIRCULAR === 'true' ||
        process.env.ALLOW_TEST_MUTATION === 'true' ||
        commitMsg.includes('ALLOW_CIRCULAR=true') ||
        commitMsg.includes('ALLOW_TEST_MUTATION=true')
    ) {
        console.log('🔄 [Circular Dependency Gate] Проверка циклических импортов пропущена флагом ALLOW_CIRCULAR=true.');
        process.exit(0);
    }

    console.log('🔄 [Circular Dependency Gate] Проверка циклических импортов в src/**/*.{ts,tsx}...');

    const result = spawnSync('npx', [
        'dpdm',
        '--no-warning',
        '--no-tree',
        '--exit-code',
        'circular:1',
        'src/**/*.{ts,tsx}',
    ], {
        encoding: 'utf-8',
        stdio: 'pipe',
        shell: true,
    });

    if (result.status === 0) {
        console.log('✅ [Circular Dependency Gate] 0 циклических зависимостей! Архитектура чиста.');
        process.exit(0);
    } else {
        console.error('❌ [Circular Dependency Gate] Обнаружены циклические зависимости в проекте:');
        if (result.stdout) {
            console.error(result.stdout);
        }
        if (result.stderr) {
            console.error(result.stderr);
        }
        console.error('\n💡 Устраните циклические импорты (вынесите общие типы/интерфейсы в types.ts или инвертируйте зависимость).');
        process.exit(1);
    }
}

verifyNoCircular();
