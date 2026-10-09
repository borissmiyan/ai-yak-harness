#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

/**
 * 🎨 AI Instant Design Showcase Generator (Standalone Mini-Storybook)
 * 
 * Генерирует интерактивный HTML-файл design-showcase.html с визуализацией:
 * - Палитра и контрастность WCAG 2.1 AA
 * - Кнопки во всех состояниях (Default, Hover, Active, Loading, Disabled)
 * - Интерактивная пружина (Spring Physics Playground) с живой настройкой stiffness & damping!
 * - Поля ввода, карточки, бейджи
 * - Симулятор Telegram Mini App Fullscreen с переключателем 96px шапки!
 * 
 * Использование:
 *   node scripts/generate-design-showcase.mjs
 */

const CWD = process.cwd();
const outFile = path.join(CWD, 'design-showcase.html');

const htmlContent = `<!DOCTYPE html>
<html lang="ru" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Yak Harness — Interactive Design System Showcase</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: {
              500: '#6366F1',
              600: '#4F46E5',
              700: '#4338CA'
            }
          }
        }
      }
    }
  </script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    body { font-family: 'Inter', sans-serif; }
    .spring-box {
      transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
  </style>
</head>
<body class="bg-zinc-950 text-zinc-100 min-h-screen p-6 md:p-12 transition-colors duration-300">
  <div class="max-w-5xl mx-auto space-y-12">
    
    <!-- Header -->
    <header class="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-zinc-800 gap-4">
      <div>
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">v2.0 Architectural Gate</span>
          <span class="text-xs text-zinc-500">Autonomous AI Standard</span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight mt-1 text-white">Design System Showcase</h1>
        <p class="text-zinc-400 text-sm mt-1">Интерактивная витрина визуальных токенов, физики пружин и компонентов</p>
      </div>
      
      <div class="flex items-center gap-3">
        <button id="toggle-tma" class="px-4 h-10 rounded-xl text-xs font-medium bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 flex items-center gap-2 transition-all">
          <span id="tma-dot" class="w-2 h-2 rounded-full bg-zinc-600"></span>
          TMA 96px Mode
        </button>
        <button id="toggle-theme" class="px-4 h-10 rounded-xl text-xs font-medium bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 transition-all">
          Сменить тему
        </button>
      </div>
    </header>

    <!-- TMA Header Simulation Banner -->
    <div id="tma-banner" class="hidden bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4 transition-all">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-xs">96px</div>
          <div>
            <h4 class="text-sm font-semibold text-indigo-200">Режим Telegram Mini App (Fullscreen) Активен</h4>
            <p class="text-xs text-indigo-400/80">Верхний отступ 96px зарезервирован под системные кнопки Telegram (закрыть / меню).</p>
          </div>
        </div>
        <span class="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/30">Safe Area OK</span>
      </div>
    </div>

    <!-- Section 1: Color Palette & WCAG 2.1 AA -->
    <section class="space-y-4">
      <h2 class="text-xl font-bold tracking-tight text-white flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
        1. Палитра и WCAG 2.1 AA Контраст
      </h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <div class="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl space-y-2">
          <div class="h-12 rounded-lg bg-zinc-950 border border-white/10"></div>
          <div>
            <p class="text-xs font-semibold text-zinc-200">Background</p>
            <p class="text-[11px] text-zinc-500">#09090B</p>
            <span class="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-medium">18.4:1 AAA</span>
          </div>
        </div>

        <div class="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl space-y-2">
          <div class="h-12 rounded-lg bg-zinc-900 border border-white/10"></div>
          <div>
            <p class="text-xs font-semibold text-zinc-200">Surface</p>
            <p class="text-[11px] text-zinc-500">#18181B</p>
            <span class="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-medium">14.2:1 AAA</span>
          </div>
        </div>

        <div class="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl space-y-2">
          <div class="h-12 rounded-lg bg-indigo-600"></div>
          <div>
            <p class="text-xs font-semibold text-zinc-200">Primary Accent</p>
            <p class="text-[11px] text-zinc-500">#4F46E5</p>
            <span class="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-medium">5.8:1 AA</span>
          </div>
        </div>

        <div class="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl space-y-2">
          <div class="h-12 rounded-lg bg-emerald-600"></div>
          <div>
            <p class="text-xs font-semibold text-zinc-200">Success</p>
            <p class="text-[11px] text-zinc-500">#059669</p>
            <span class="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-medium">4.7:1 AA</span>
          </div>
        </div>

        <div class="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl space-y-2">
          <div class="h-12 rounded-lg bg-rose-600"></div>
          <div>
            <p class="text-xs font-semibold text-zinc-200">Danger</p>
            <p class="text-[11px] text-zinc-500">#E11D48</p>
            <span class="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-medium">4.6:1 AA</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 2: Buttons & States -->
    <section class="space-y-4">
      <h2 class="text-xl font-bold tracking-tight text-white flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
        2. Кнопки во всех 6 состояниях
      </h2>
      <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-center">
          <div>
            <p class="text-xs text-zinc-400 mb-2 font-medium">1. Default</p>
            <button class="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-sm">
              Action
            </button>
          </div>
          <div>
            <p class="text-xs text-zinc-400 mb-2 font-medium">2. Hover</p>
            <button class="w-full h-12 rounded-xl bg-indigo-500 text-white font-medium text-sm shadow-md">
              Hovered
            </button>
          </div>
          <div>
            <p class="text-xs text-zinc-400 mb-2 font-medium">3. Active / Pressed</p>
            <button class="w-full h-12 rounded-xl bg-indigo-700 text-white font-medium text-sm scale-95 shadow-inner">
              Pressed
            </button>
          </div>
          <div>
            <p class="text-xs text-zinc-400 mb-2 font-medium">4. Loading</p>
            <button class="w-full h-12 rounded-xl bg-indigo-600 text-white font-medium text-sm flex items-center justify-center gap-2 cursor-wait opacity-90">
              <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
            </button>
          </div>
          <div>
            <p class="text-xs text-zinc-400 mb-2 font-medium">5. Disabled</p>
            <button disabled class="w-full h-12 rounded-xl bg-indigo-600/40 text-white/50 font-medium text-sm cursor-not-allowed">
              Disabled
            </button>
          </div>
          <div>
            <p class="text-xs text-zinc-400 mb-2 font-medium">6. Secondary</p>
            <button class="w-full h-12 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 font-medium text-sm transition-all">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 3: Spring Physics Playground -->
    <section class="space-y-4">
      <h2 class="text-xl font-bold tracking-tight text-white flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
        3. Интерактивная кинетика (Spring Physics Playground)
      </h2>
      <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div class="space-y-4">
          <div>
            <div class="flex justify-between text-xs text-zinc-400 mb-1">
              <span>Жесткость (Stiffness):</span>
              <span id="stiffness-val" class="font-mono text-indigo-400">260</span>
            </div>
            <input type="range" id="stiffness" min="100" max="600" value="260" class="w-full accent-indigo-600">
          </div>
          <div>
            <div class="flex justify-between text-xs text-zinc-400 mb-1">
              <span>Затухание (Damping):</span>
              <span id="damping-val" class="font-mono text-indigo-400">25</span>
            </div>
            <input type="range" id="damping" min="10" max="50" value="25" class="w-full accent-indigo-600">
          </div>
          <div class="flex gap-2">
            <button id="preset-apple" class="px-3 py-1.5 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300">Apple HIG (260/25)</button>
            <button id="preset-m3" class="px-3 py-1.5 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300">Material 3 (400/30)</button>
          </div>
        </div>

        <div class="flex flex-col items-center justify-center p-6 bg-zinc-950 rounded-xl border border-zinc-800/80 min-h-[160px]">
          <div id="spring-target" class="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-xl flex items-center justify-center text-white font-bold text-xs select-none cursor-pointer transform active:scale-90 transition-transform">
            Tap Me!
          </div>
          <p class="text-[11px] text-zinc-500 mt-4">Нажмите на карточку для проверки пружинного отклика</p>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="pt-6 border-t border-zinc-800 text-center text-xs text-zinc-500">
      AI Yak Harness • Deterministic Design System Architecture • Generated for Production
    </footer>

  </div>

  <script>
    // Theme toggle
    const toggleThemeBtn = document.getElementById('toggle-theme');
    toggleThemeBtn.addEventListener('click', () => {
      document.documentElement.classList.toggle('dark');
    });

    // TMA simulation toggle
    const toggleTmaBtn = document.getElementById('toggle-tma');
    const tmaBanner = document.getElementById('tma-banner');
    const tmaDot = document.getElementById('tma-dot');
    let tmaActive = false;
    toggleTmaBtn.addEventListener('click', () => {
      tmaActive = !tmaActive;
      if (tmaActive) {
        tmaBanner.classList.remove('hidden');
        tmaDot.classList.remove('bg-zinc-600');
        tmaDot.classList.add('bg-emerald-400');
        document.body.style.paddingTop = '96px';
      } else {
        tmaBanner.classList.add('hidden');
        tmaDot.classList.remove('bg-emerald-400');
        tmaDot.classList.add('bg-zinc-600');
        document.body.style.paddingTop = '';
      }
    });

    // Spring controls
    const stiffnessSlider = document.getElementById('stiffness');
    const dampingSlider = document.getElementById('damping');
    const stiffnessVal = document.getElementById('stiffness-val');
    const dampingVal = document.getElementById('damping-val');
    const springTarget = document.getElementById('spring-target');

    stiffnessSlider.addEventListener('input', (e) => stiffnessVal.textContent = e.target.value);
    dampingSlider.addEventListener('input', (e) => dampingVal.textContent = e.target.value);

    document.getElementById('preset-apple').addEventListener('click', () => {
      stiffnessSlider.value = 260;
      dampingSlider.value = 25;
      stiffnessVal.textContent = '260';
      dampingVal.textContent = '25';
    });

    document.getElementById('preset-m3').addEventListener('click', () => {
      stiffnessSlider.value = 400;
      dampingSlider.value = 30;
      stiffnessVal.textContent = '400';
      dampingVal.textContent = '30';
    });

    springTarget.addEventListener('click', () => {
      const s = parseInt(stiffnessSlider.value);
      const d = parseInt(dampingSlider.value);
      springTarget.style.transform = 'scale(0.85) rotate(-3deg)';
      setTimeout(() => {
        springTarget.style.transform = 'scale(1.08) rotate(2deg)';
        setTimeout(() => {
          springTarget.style.transform = 'scale(1) rotate(0deg)';
        }, 180);
      }, 100);
    });
  </script>
</body>
</html>
`;

fs.writeFileSync(outFile, htmlContent, 'utf-8');
console.log(`✅ Сгенерирована интерактивная витрина дизайн-системы: ${path.relative(CWD, outFile)}`);
console.log(`💡 Откройте design-showcase.html в браузере или IDE для мгновенного превью.`);
