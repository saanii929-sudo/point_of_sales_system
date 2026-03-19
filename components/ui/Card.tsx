'use client';

import { HTMLAttributes, forwardRef } from 'react';

// ── Variant types ──────────────────────────────────────────
type CardVariant = 'default' | 'flat' | 'elevated' | 'glass' | 'brand' | 'outline';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?:  CardVariant;
  hover?:    boolean;
  padding?:  boolean;
  noBorder?: boolean;
  /** @deprecated use variant="glass" instead */
  glass?:    boolean;
}

const cardVariants: Record<CardVariant, string> = {
  default:
    'bg-[var(--bg-surface)] border border-[var(--border-subtle)] ' +
    'shadow-[var(--shadow-card)]',

  flat:
    'bg-[var(--bg-surface)] border border-[var(--border-subtle)]',

  elevated:
    'bg-[var(--bg-surface)] border border-[var(--border-subtle)] ' +
    'shadow-[var(--shadow-elevated)]',

  glass:
    'backdrop-blur-xl bg-white/75 dark:bg-slate-900/70 ' +
    'border border-white/40 dark:border-white/10 ' +
    'shadow-[var(--shadow-glass)]',

  brand:
    'bg-gradient-to-br from-emerald-500 to-emerald-700 ' +
    'border border-emerald-400/30 text-white ' +
    'shadow-[var(--shadow-brand)]',

  outline:
    'bg-transparent border-2 border-[var(--border-default)]',
};

// ── Card ───────────────────────────────────────────────────
export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className = '',
      variant = 'default',
      hover = false,
      padding = false,
      noBorder = false,
      glass,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={[
          'rounded-2xl overflow-hidden',
          cardVariants[glass ? 'glass' : variant],
          noBorder ? 'border-0' : '',
          hover
            ? 'transition-all duration-250 hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)] hover:border-[var(--border-default)] cursor-pointer'
            : '',
          padding ? 'p-6' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

// ── CardHeader ─────────────────────────────────────────────
interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  action?: React.ReactNode;
}

export function CardHeader({
  className = '',
  children,
  action,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={[
        'px-6 py-4 flex items-center justify-between',
        'border-b border-[var(--border-subtle)]',
        className,
      ].join(' ')}
      {...props}
    >
      <div className="flex-1 min-w-0">{children}</div>
      {action && <div className="flex-shrink-0 ml-4">{action}</div>}
    </div>
  );
}

// ── CardBody ───────────────────────────────────────────────
export function CardBody({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-6 py-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

// ── CardFooter ─────────────────────────────────────────────
export function CardFooter({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        'px-6 py-4',
        'border-t border-[var(--border-subtle)]',
        'bg-[var(--bg-surface-2)]',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}

// ── StatCard ───────────────────────────────────────────────
interface StatCardProps {
  title:       string;
  value:       string | number;
  change?:     string;
  changeType?: 'up' | 'down' | 'neutral';
  icon?:       React.ReactNode;
  iconColor?:  string;
  suffix?:     string;
  className?:  string;
}

export function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  iconColor = 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600',
  suffix,
  className = '',
}: StatCardProps) {
  const changeColors = {
    up:      'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30',
    down:    'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30',
    neutral: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30',
  };
  const changeArrow = { up: '↑', down: '↓', neutral: '→' };

  return (
    <div
      className={[
        'stat-card',
        className,
      ].join(' ')}
    >
      <div className="flex items-start justify-between mb-3">
        {icon && (
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
            {icon}
          </div>
        )}
        {change && (
          <span
            className={`badge text-xs font-semibold px-2.5 py-1 rounded-full ${changeColors[changeType]}`}
          >
            {changeArrow[changeType]} {change}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">{title}</p>
        <p className="text-2xl font-bold text-[var(--text-primary)] tracking-tight leading-none">
          {value}
          {suffix && (
            <span className="text-sm font-medium text-[var(--text-tertiary)] ml-1">{suffix}</span>
          )}
        </p>
      </div>
    </div>
  );
}
