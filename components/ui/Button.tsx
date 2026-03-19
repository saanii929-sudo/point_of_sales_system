'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'warning' | 'outline';
type Size    = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   Variant;
  size?:      Size;
  isLoading?: boolean;
  leftIcon?:  React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 ' +
    'text-white shadow-[0_4px_14px_0_rgba(16,185,129,0.25)] hover:shadow-[0_6px_24px_0_rgba(16,185,129,0.38)] ' +
    'focus:ring-4 focus:ring-emerald-500/25',

  secondary:
    'bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] ' +
    'text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-strong)] ' +
    'focus:ring-4 focus:ring-gray-400/20',

  ghost:
    'bg-transparent hover:bg-[var(--bg-surface-2)] ' +
    'text-[var(--text-secondary)] hover:text-[var(--text-primary)] ' +
    'focus:ring-4 focus:ring-gray-400/20',

  success:
    'bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 ' +
    'text-white shadow-[0_4px_14px_0_rgba(16,185,129,0.25)] hover:shadow-[0_6px_24px_0_rgba(16,185,129,0.38)] ' +
    'focus:ring-4 focus:ring-emerald-500/25',

  danger:
    'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 ' +
    'text-white shadow-[0_4px_14px_0_rgba(239,68,68,0.25)] hover:shadow-[0_6px_24px_0_rgba(239,68,68,0.38)] ' +
    'focus:ring-4 focus:ring-red-500/25',

  warning:
    'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 ' +
    'text-white shadow-[0_4px_14px_0_rgba(245,158,11,0.25)] hover:shadow-[0_6px_24px_0_rgba(245,158,11,0.38)] ' +
    'focus:ring-4 focus:ring-amber-500/25',

  outline:
    'bg-transparent border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 ' +
    'hover:bg-emerald-50 dark:hover:bg-emerald-950/30 ' +
    'focus:ring-4 focus:ring-emerald-500/25',
};

const sizes: Record<Size, string> = {
  xs: 'px-2.5 py-1.5 text-xs rounded-lg',
  sm: 'px-3.5 py-2 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-[10px]',
  lg: 'px-6 py-3 text-base rounded-xl',
  xl: 'px-8 py-3.5 text-base rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={[
          // Base
          'inline-flex items-center justify-center gap-2',
          'font-semibold leading-none whitespace-nowrap',
          'transition-all duration-200',
          'active:scale-[0.97]',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          'outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
          // Variant
          variants[variant],
          // Size
          sizes[size],
          // Width
          fullWidth ? 'w-full' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin h-4 w-4 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          leftIcon && <span className="flex-shrink-0">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
