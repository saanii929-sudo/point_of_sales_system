'use client';

import { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, forwardRef, ReactNode } from 'react';

// ── Input ──────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:      string;
  error?:      string;
  hint?:       string;
  leftIcon?:   ReactNode;
  rightIcon?:  ReactNode;
  onRightIconClick?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = '',
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      onRightIconClick,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <span className="text-[var(--text-tertiary)] w-4 h-4">{leftIcon}</span>
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={[
              'w-full',
              'bg-[var(--bg-surface)]',
              'border-[1.5px]',
              error
                ? 'border-red-400 dark:border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/15'
                : 'border-[var(--border-default)] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15',
              'rounded-[10px]',
              'text-[var(--text-primary)]',
              'placeholder:text-[var(--text-tertiary)]',
              'text-[0.9375rem]',
              'transition-all duration-200',
              'outline-none',
              'hover:border-[var(--border-strong)]',
              leftIcon ? 'pl-10' : 'pl-3.5',
              rightIcon ? 'pr-10' : 'pr-3.5',
              'py-2.5',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...props}
          />
          {rightIcon && (
            <div
              className={[
                'absolute inset-y-0 right-0 pr-3.5 flex items-center',
                onRightIconClick ? 'cursor-pointer' : 'pointer-events-none',
              ].join(' ')}
              onClick={onRightIconClick}
            >
              <span className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] w-4 h-4 transition-colors">
                {rightIcon}
              </span>
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
            <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">{hint}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

// ── Textarea ───────────────────────────────────────────────
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?:  string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', label, error, hint, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={[
            'w-full',
            'bg-[var(--bg-surface)]',
            'border-[1.5px]',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/15'
              : 'border-[var(--border-default)] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15',
            'rounded-[10px] px-3.5 py-2.5',
            'text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]',
            'text-[0.9375rem]',
            'resize-y min-h-[100px]',
            'transition-all duration-200 outline-none',
            'hover:border-[var(--border-strong)]',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">{hint}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

// ── Select ─────────────────────────────────────────────────
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?:    string;
  error?:    string;
  hint?:     string;
  options?:  { value: string; label: string; disabled?: boolean }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, error, hint, options, children, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={[
              'w-full appearance-none',
              'bg-[var(--bg-surface)]',
              'border-[1.5px]',
              error
                ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/15'
                : 'border-[var(--border-default)] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15',
              'rounded-[10px] pl-3.5 pr-10 py-2.5',
              'text-[var(--text-primary)]',
              'text-[0.9375rem]',
              'transition-all duration-200 outline-none cursor-pointer',
              'hover:border-[var(--border-strong)]',
              className,
            ]
              .filter(Boolean)
              .join(' ')}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          {/* Chevron */}
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && (
          <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">{hint}</p>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';
