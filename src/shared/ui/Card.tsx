import React from 'react';

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
      className={`bg-zinc-900/80 border border-white/10 rounded-2xl p-5 backdrop-blur-sm transition-all ${
        interactive ? 'hover:border-white/20 active:scale-[0.99] cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});
