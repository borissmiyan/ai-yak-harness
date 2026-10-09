#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

/**
 * 🎨 AI UI-Kit Scaffolder (Zero-to-One Component Generator)
 * 
 * Генерирует 5 канонических UI-примитивов (Button, Input, Badge, Card, SpringSheet)
 * в src/shared/ui/ со всеми 6 состояниями, поддержкой ARIA и регистрацией в COMPONENTS.md.
 * 
 * Использование:
 *   node scripts/scaffold-ui-kit.mjs
 */

const CWD = process.cwd();
const UI_DIR = path.join(CWD, 'src', 'shared', 'ui');
fs.mkdirSync(UI_DIR, { recursive: true });

// 1. Button.tsx
const buttonCode = `import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.memo(function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer';

  const sizeStyles = {
    sm: 'h-9 px-3 text-sm rounded-lg gap-1.5',
    md: 'h-12 px-5 text-base rounded-xl gap-2',
    lg: 'h-14 px-6 text-lg rounded-2xl gap-2.5'
  }[size];

  const variantStyles = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm',
    secondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-white/10',
    outline: 'bg-transparent border border-zinc-700 hover:bg-zinc-800 text-zinc-200',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white',
    ghost: 'bg-transparent hover:bg-zinc-800/60 text-zinc-300'
  }[variant];

  return (
    <button
      className={\`\${baseStyles} \${sizeStyles} \${variantStyles} \${className}\`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});
`;

// 2. Input.tsx
const inputCode = `import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export const Input = React.memo(function Input({
  label,
  error,
  leftIcon,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-zinc-300">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 text-zinc-400 pointer-events-none flex items-center">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={\`w-full h-12 bg-zinc-900 border text-zinc-100 rounded-xl px-4 text-base transition-colors placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed \${
            leftIcon ? 'pl-11' : ''
          } \${
            error ? 'border-rose-500 focus:border-rose-500' : 'border-zinc-800 focus:border-indigo-500'
          } \${className}\`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-rose-400 mt-0.5">{error}</p>}
    </div>
  );
});
`;

// 3. Badge.tsx
const badgeCode = `import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'outline';
}

export const Badge = React.memo(function Badge({
  variant = 'default',
  children,
  className = '',
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: 'bg-zinc-800 text-zinc-200 border border-zinc-700',
    success: 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60',
    warning: 'bg-amber-950/80 text-amber-400 border border-amber-800/60',
    danger: 'bg-rose-950/80 text-rose-400 border border-rose-800/60',
    outline: 'bg-transparent text-zinc-400 border border-zinc-800'
  }[variant];

  return (
    <span
      className={\`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tabular-nums \${variantStyles} \${className}\`}
      {...props}
    >
      {children}
    </span>
  );
});
`;

// 4. Card.tsx
const cardCode = `import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export const Card = React.memo(function Card({
  interactive = false,
  children,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={\`bg-zinc-900/80 border border-white/10 rounded-2xl p-5 backdrop-blur-sm transition-all \${
        interactive ? 'hover:border-white/20 active:scale-[0.99] cursor-pointer' : ''
      } \${className}\`}
      {...props}
    >
      {children}
    </div>
  );
});
`;

// 5. SpringSheet.tsx
const sheetCode = `import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface SpringSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const SpringSheet = React.memo(function SpringSheet({
  isOpen,
  onClose,
  title,
  children
}: SpringSheetProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Container */}
      <div
        className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl z-10 transition-transform duration-300 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-4">
          {title && <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors ml-auto"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
});
`;

const components = [
  { name: 'Button.tsx', code: buttonCode, desc: 'Каноническая кнопка (все 6 состояний, h-12/h-14, loader, Lucide)' },
  { name: 'Input.tsx', code: inputCode, desc: 'Поле ввода с иконкой, состояниями фокуса и ошибками' },
  { name: 'Badge.tsx', code: badgeCode, desc: 'Статусный бейдж с поддержкой tabular-nums' },
  { name: 'Card.tsx', code: cardCode, desc: 'Карточка контента с дизайн-токенами скруглений и бордеров' },
  { name: 'SpringSheet.tsx', code: sheetCode, desc: 'Пружинная модальная шторка (Spring Bottom Sheet) с backdrop' }
];

console.log('🚀 Развертывание базового UI-Kit...');

for (const comp of components) {
  const filePath = path.join(UI_DIR, comp.name);
  fs.writeFileSync(filePath, comp.code, 'utf-8');
  console.log(`  ✔ Сгенерирован компонент: src/shared/ui/${comp.name}`);
}

// Регистрируем в COMPONENTS.md
const docPaths = [
  path.join(CWD, 'COMPONENTS.md'),
  path.join(CWD, 'templates', 'docs', 'COMPONENTS.md')
];

const today = new Date().toISOString().slice(0, 10);

for (const docP of docPaths) {
  if (fs.existsSync(docP)) {
    let content = fs.readFileSync(docP, 'utf-8');
    let addedCount = 0;
    for (const comp of components) {
      const baseName = comp.name.replace('.tsx', '');
      if (!content.includes(`\`${baseName}\``)) {
        content += `\n| \`${baseName}\` | \`src/shared/ui/${comp.name}\` | ${comp.desc} | stable | ${today} |`;
        addedCount++;
      }
    }
    if (addedCount > 0) {
      fs.writeFileSync(docP, content, 'utf-8');
      console.log(`  📑 Зарегистрировано компонентов в ${path.relative(CWD, docP)}: +${addedCount}`);
    }
  }
}

console.log('✅ Базовый UI-Kit успешно развернут и зарегистрирован в дизайн-системе!');
