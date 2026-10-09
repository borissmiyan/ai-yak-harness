#!/usr/bin/env node

/**
 * 🌲 Ephemeral Git Worktree Manager (Pillar 7)
 * 
 * Предоставляет изолированные песочницы для агентов через git worktree:
 * - Быстрое создание изолированного рабочего дерева без дублирования node_modules (через symlink)
 * - Автономная ветка agent/<name>
 * - Безопасное удаление и очистка (prune)
 * 
 * Использование:
 *   node scripts/harness-worktree.mjs create <task-name>
 *   node scripts/harness-worktree.mjs list
 *   node scripts/harness-worktree.mjs remove <task-name> [--delete-branch]
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const command = process.argv[2];
const taskName = process.argv[3];
const deleteBranch = process.argv.includes('--delete-branch');

function run(cmd, options = {}) {
  return execSync(cmd, { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe', ...options });
}

function showHelp() {
  console.log(`
🌲 Использование Ephemeral Worktree Manager:
  node scripts/harness-worktree.mjs create <task-name>
  node scripts/harness-worktree.mjs list
  node scripts/harness-worktree.mjs remove <task-name> [--delete-branch]
`);
}

switch (command) {
  case 'create': {
    if (!taskName) {
      console.error('❌ Ошибка: Укажите имя задачи: node scripts/harness-worktree.mjs create <task-name>');
      process.exit(1);
    }

    const sanitizedName = taskName.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
    const branchName = `agent/${sanitizedName}`;
    const worktreeDir = path.join(projectRoot, '.worktrees', sanitizedName);

    console.log(`🌲 Создание изолированной песочницы для задачи [${sanitizedName}]...`);

    if (fs.existsSync(worktreeDir)) {
      console.error(`❌ Ошибка: Директория песочницы уже существует: ${worktreeDir}`);
      process.exit(1);
    }

    // Создаем каталог .worktrees если нет
    const baseWorktreesDir = path.join(projectRoot, '.worktrees');
    if (!fs.existsSync(baseWorktreesDir)) {
      fs.mkdirSync(baseWorktreesDir, { recursive: true });
    }

    try {
      // Проверяем существование ветки
      let branchExists = false;
      try {
        run(`git rev-parse --verify ${branchName}`);
        branchExists = true;
      } catch {
        branchExists = false;
      }

      if (branchExists) {
        run(`git worktree add "${worktreeDir}" "${branchName}"`);
      } else {
        run(`git worktree add -b "${branchName}" "${worktreeDir}" HEAD`);
      }

      // Создаем симлинк на node_modules для мгновенной сборки без переустановки
      const rootNodeModules = path.join(projectRoot, 'node_modules');
      const targetNodeModules = path.join(worktreeDir, 'node_modules');
      if (fs.existsSync(rootNodeModules) && !fs.existsSync(targetNodeModules)) {
        try {
          fs.symlinkSync(rootNodeModules, targetNodeModules, 'junction');
        } catch {
          // Игнорируем ошибку симлинка если платформа не поддерживает без прав администратора
        }
      }

      // Копируем локальный .env файл при наличии
      const envPath = path.join(projectRoot, '.env');
      const targetEnv = path.join(worktreeDir, '.env');
      if (fs.existsSync(envPath) && !fs.existsSync(targetEnv)) {
        fs.copyFileSync(envPath, targetEnv);
      }

      console.log(`✅ Песочница успешно создана!`);
      console.log(`📁 Путь: ${worktreeDir}`);
      console.log(`🌿 Ветка: ${branchName}`);
      console.log(`💡 Для перехода выполните: cd "${worktreeDir}"`);
    } catch (err) {
      console.error('❌ Ошибка при создании worktree:', err.message);
      process.exit(1);
    }
    break;
  }

  case 'remove': {
    if (!taskName) {
      console.error('❌ Ошибка: Укажите имя задачи: node scripts/harness-worktree.mjs remove <task-name>');
      process.exit(1);
    }

    const sanitizedName = taskName.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
    const branchName = `agent/${sanitizedName}`;
    const worktreeDir = path.join(projectRoot, '.worktrees', sanitizedName);

    console.log(`🧹 Очистка песочницы [${sanitizedName}]...`);

    try {
      if (fs.existsSync(worktreeDir)) {
        run(`git worktree remove --force "${worktreeDir}"`);
      }
      run(`git worktree prune`);

      if (deleteBranch) {
        try {
          run(`git branch -D "${branchName}"`);
          console.log(`🗑️ Ветка ${branchName} удалена.`);
        } catch {
          console.log(`ℹ️ Ветка ${branchName} не найдена или уже удалена.`);
        }
      }

      console.log(`✅ Песочница ${sanitizedName} удалена.`);
    } catch (err) {
      console.error('❌ Ошибка при удалении worktree:', err.message);
      process.exit(1);
    }
    break;
  }

  case 'list': {
    console.log('📋 Список активных git worktrees:');
    try {
      const output = run('git worktree list');
      console.log(output);
    } catch (err) {
      console.error('❌ Ошибка чтения списка worktrees:', err.message);
      process.exit(1);
    }
    break;
  }

  default:
    showHelp();
    break;
}
