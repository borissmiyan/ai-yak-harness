/**
 * 📦 Vite Bundle Analysis & Visualizer Snippet (Pillar 3)
 * 
 * Добавьте эти строки в ваш vite.config.ts для поддержки визуализатора бандлов:
 * 
 * 1. Импорт в начале файла:
 * import { visualizer } from 'rollup-plugin-visualizer';
 * 
 * 2. Добавление плагина в секцию plugins:
 * plugins: [
 *   react(),
 *   ...(process.env.ANALYZE === 'true'
 *     ? [
 *         visualizer({
 *           filename: 'dist/stats.html',
 *           gzipSize: true,
 *           brotliSize: true,
 *           open: false,
 *         }),
 *       ]
 *     : []),
 * ]
 * 
 * Использование:
 * npm run build:analyze  (или ANALYZE=true vite build)
 * Сгенерирует интерактивную карту бандла в dist/stats.html
 */
