#!/usr/bin/env node
/**
 * 🔄 AI Yak Harness Project Updater (CLI Entrypoint)
 * 
 * Делегирует выполнение в единый универсальный менеджер харнесса (setup.mjs).
 * Поддерживает интерактивный выбор проекта, множественный ввод (номера через пробел + Enter)
 * и массовое обновление через --all.
 */
import { main } from './setup.mjs';

main();
