/**
 * ⚡ React-Scan Runtime Re-Render Profiler Snippet (Pillar 8)
 * 
 * Вставьте эти строки в src/main.tsx перед рендером React:
 * 
 * // Профайлер визуальных ре-рендеров строго в режиме разработки (zero overhead в продакшене)
 * if (import.meta.env.DEV && typeof window !== 'undefined') {
 *   import('react-scan').then(({ scan }) => {
 *     scan({ enabled: true, log: false });
 *   }).catch(() => {
 *     // Silently ignore in environments without canvas/dom support
 *   });
 * }
 */
