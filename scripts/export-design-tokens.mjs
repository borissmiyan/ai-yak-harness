#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

/**
 * 🎨 AI Token-to-Code Exporter (Tailwind CSS v4 & TypeScript Tokens)
 * 
 * Автоматически генерирует файл темы (src/index.css с блоком @theme и/или src/shared/theme/tokens.ts)
 * на основе одного из 9 канонических стилей или параметров из DESIGN-AI.md.
 * 
 * Использование:
 *   node scripts/export-design-tokens.mjs --style neo-brutalism
 *   node scripts/export-design-tokens.mjs --style minimalist-luxury
 *   node scripts/export-design-tokens.mjs --style glassmorphism
 *   node scripts/export-design-tokens.mjs --style material3-expressive
 *   node scripts/export-design-tokens.mjs --style apple-hig-fluid
 *   node scripts/export-design-tokens.mjs --style cyberpunk-industrial
 *   node scripts/export-design-tokens.mjs --style neumorphism
 *   node scripts/export-design-tokens.mjs --style modern-b2b-saas
 *   node scripts/export-design-tokens.mjs --style y2k-retro
 */

const CWD = process.cwd();
const styleArg = process.argv.find((a, i) => process.argv[i - 1] === '--style') || 'minimalist-luxury';

const STYLES = {
    'neo-brutalism': {
        name: 'Neo-Brutalism',
        bg: '#FFFDF9',
        surface: '#FFFFFF',
        text: '#000000',
        textMuted: '#555555',
        primary: '#FFDE59',
        border: '#000000',
        borderWidth: '2px',
        radiusCard: '0px',
        radiusButton: '4px',
        radiusInput: '4px',
        shadowCard: '4px 4px 0px 0px #000000',
        shadowButton: '3px 3px 0px 0px #000000',
        fontSans: "'Public Sans', -apple-system, sans-serif",
        touchHeight: '52px',
        springStiffness: '450',
        springDamping: '28'
    },
    'minimalist-luxury': {
        name: 'Minimalist Luxury (Linear/Vercel)',
        bg: '#09090b',
        surface: '#121215',
        text: '#FAFAFA',
        textMuted: '#A1A1AA',
        primary: '#FFFFFF',
        border: 'rgba(255, 255, 255, 0.1)',
        borderWidth: '1px',
        radiusCard: '16px',
        radiusButton: '12px',
        radiusInput: '10px',
        shadowCard: '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
        shadowButton: '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
        fontSans: "'Inter', -apple-system, sans-serif",
        touchHeight: '48px',
        springStiffness: '260',
        springDamping: '25'
    },
    'glassmorphism': {
        name: 'Glassmorphism / Frosted Vision',
        bg: '#0B0F19',
        surface: 'rgba(255, 255, 255, 0.08)',
        text: '#F3F4F6',
        textMuted: '#9CA3AF',
        primary: '#6366F1',
        border: 'rgba(255, 255, 255, 0.18)',
        borderWidth: '1px',
        radiusCard: '24px',
        radiusButton: '16px',
        radiusInput: '14px',
        shadowCard: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        shadowButton: '0 4px 14px 0 rgba(99, 102, 241, 0.39)',
        fontSans: "'Inter', system-ui, sans-serif",
        touchHeight: '54px',
        springStiffness: '300',
        springDamping: '24',
        backdropBlur: '20px'
    },
    'material3-expressive': {
        name: 'Material 3 Expressive (Google)',
        bg: '#F8F9FA',
        surface: '#FFFFFF',
        text: '#1C1B1F',
        textMuted: '#49454F',
        primary: '#6750A4',
        border: 'transparent',
        borderWidth: '0px',
        radiusCard: '28px',
        radiusButton: '24px',
        radiusInput: '16px',
        shadowCard: '0 1px 3px 1px rgba(0, 0, 0, 0.15)',
        shadowButton: '0 1px 2px rgba(0, 0, 0, 0.3)',
        fontSans: "'Roboto', system-ui, sans-serif",
        touchHeight: '56px',
        springStiffness: '400',
        springDamping: '30'
    },
    'apple-hig-fluid': {
        name: 'Apple HIG Fluid (iOS 18)',
        bg: '#F2F2F7',
        surface: '#FFFFFF',
        text: '#000000',
        textMuted: '#8E8E93',
        primary: '#007AFF',
        border: 'rgba(60, 60, 67, 0.12)',
        borderWidth: '0.5px',
        radiusCard: '20px',
        radiusButton: '14px',
        radiusInput: '12px',
        shadowCard: '0 2px 10px rgba(0, 0, 0, 0.06)',
        shadowButton: 'none',
        fontSans: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
        touchHeight: '50px',
        springStiffness: '260',
        springDamping: '25'
    },
    'cyberpunk-industrial': {
        name: 'Cyberpunk Industrial',
        bg: '#05070B',
        surface: '#0E131F',
        text: '#00F0FF',
        textMuted: '#4C6085',
        primary: '#00F0FF',
        border: '#00F0FF',
        borderWidth: '1px',
        radiusCard: '4px',
        radiusButton: '2px',
        radiusInput: '2px',
        shadowCard: '0 0 15px rgba(0, 240, 255, 0.2)',
        shadowButton: '0 0 10px rgba(0, 240, 255, 0.4)',
        fontSans: "'Rajdhani', monospace, sans-serif",
        touchHeight: '48px',
        springStiffness: '500',
        springDamping: '32'
    },
    'neumorphism': {
        name: 'Neumorphism / Soft Tactile 3D',
        bg: '#E0E5EC',
        surface: '#E0E5EC',
        text: '#2D3748',
        textMuted: '#718096',
        primary: '#4A5568',
        border: 'transparent',
        borderWidth: '0px',
        radiusCard: '24px',
        radiusButton: '16px',
        radiusInput: '14px',
        shadowCard: '9px 9px 16px #A3B1C6, -9px -9px 16px #FFFFFF',
        shadowButton: '5px 5px 10px #A3B1C6, -5px -5px 10px #FFFFFF',
        fontSans: "'Inter', sans-serif",
        touchHeight: '54px',
        springStiffness: '320',
        springDamping: '26'
    },
    'modern-b2b-saas': {
        name: 'Modern B2B Clean SaaS (Stripe/Tailwind UI)',
        bg: '#FFFFFF',
        surface: '#F9FAFB',
        text: '#111827',
        textMuted: '#6B7280',
        primary: '#4F46E5',
        border: '#E5E7EB',
        borderWidth: '1px',
        radiusCard: '12px',
        radiusButton: '8px',
        radiusInput: '8px',
        shadowCard: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        shadowButton: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        fontSans: "'Inter', system-ui, sans-serif",
        touchHeight: '42px',
        springStiffness: '350',
        springDamping: '28'
    },
    'y2k-retro': {
        name: 'Y2K Retro OS 90s',
        bg: '#008080',
        surface: '#C0C0C0',
        text: '#000000',
        textMuted: '#808080',
        primary: '#000080',
        border: '#FFFFFF',
        borderWidth: '2px',
        radiusCard: '0px',
        radiusButton: '0px',
        radiusInput: '0px',
        shadowCard: 'inset 1px 1px #dfdfdf, 1px 0 #000, 0 1px #000, 1px 1px #000',
        shadowButton: 'inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px #808080',
        fontSans: "'MS Sans Serif', Tahoma, sans-serif",
        touchHeight: '36px',
        springStiffness: '600',
        springDamping: '35'
    }
};

const token = STYLES[styleArg] || STYLES['minimalist-luxury'];

console.log(`🎨 Экспорт дизайн-токенов для стиля: ${token.name}...`);

// 1. Генерируем Tailwind CSS v4 @theme CSS
const cssTheme = `@import "tailwindcss";

@theme {
  --color-bg-base: ${token.bg};
  --color-surface-base: ${token.surface};
  --color-text-main: ${token.text};
  --color-text-muted: ${token.textMuted};
  --color-primary-main: ${token.primary};
  --color-border-main: ${token.border};

  --radius-card: ${token.radiusCard};
  --radius-button: ${token.radiusButton};
  --radius-input: ${token.radiusInput};

  --shadow-card: ${token.shadowCard};
  --shadow-button: ${token.shadowButton};

  --font-sans: ${token.fontSans};

  --height-touch-target: ${token.touchHeight};

  --ease-spring-smooth: cubic-bezier(0.16, 1, 0.3, 1);
  --spring-stiffness: ${token.springStiffness};
  --spring-damping: ${token.springDamping};
}

:root {
  color-scheme: ${token.bg.startsWith('#0') || token.bg.startsWith('#1') ? 'dark' : 'light'};
}
`;

// 2. Генерируем TypeScript токены
const tsTheme = `/**
 * 🎨 AI Generated Design Tokens (${token.name})
 */
export const DESIGN_TOKENS = {
  styleName: '${token.name}',
  colors: {
    bg: '${token.bg}',
    surface: '${token.surface}',
    text: '${token.text}',
    textMuted: '${token.textMuted}',
    primary: '${token.primary}',
    border: '${token.border}'
  },
  geometry: {
    radiusCard: '${token.radiusCard}',
    radiusButton: '${token.radiusButton}',
    radiusInput: '${token.radiusInput}',
    borderWidth: '${token.borderWidth}',
    touchHeight: '${token.touchHeight}'
  },
  shadows: {
    card: '${token.shadowCard}',
    button: '${token.shadowButton}'
  },
  motion: {
    spring: {
      stiffness: ${token.springStiffness},
      damping: ${token.springDamping}
    }
  }
} as const;

export type DesignTokens = typeof DESIGN_TOKENS;
`;

// Записываем файлы
const outCss = path.join(CWD, 'src', 'index.css');
const themeDir = path.join(CWD, 'src', 'shared', 'theme');
const outTs = path.join(themeDir, 'tokens.ts');

fs.mkdirSync(path.join(CWD, 'src'), { recursive: true });
fs.mkdirSync(themeDir, { recursive: true });

fs.writeFileSync(outCss, cssTheme, 'utf-8');
fs.writeFileSync(outTs, tsTheme, 'utf-8');

console.log(`✅ Сгенерирован Tailwind v4 CSS: ${path.relative(CWD, outCss)}`);
console.log(`✅ Сгенерирован TypeScript Theme: ${path.relative(CWD, outTs)}`);
console.log(`✨ Стиль [${token.name}] успешно интегрирован в проект!`);
