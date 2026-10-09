import React from 'react';

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
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tabular-nums ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
});
