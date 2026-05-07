'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Focus confirm button when opened
  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  const variantConfig = {
    danger:  { iconBg: '#fef2f2', iconColor: '#ef4444', btnBg: 'from-red-500 to-red-600', shadow: 'shadow-red-500/25' },
    warning: { iconBg: '#fffbeb', iconColor: '#f59e0b', btnBg: 'from-amber-500 to-amber-600', shadow: 'shadow-amber-500/25' },
    info:    { iconBg: '#eff6ff', iconColor: '#3b82f6', btnBg: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/25' },
  }[variant];

  const Icon = variant === 'danger' ? Trash2 : AlertTriangle;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-sm bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-[var(--shadow-floating)] p-6 animate-fade-in-up"
      >
        {/* Close */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-[var(--bg-surface-2)] text-[var(--text-tertiary)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
          style={{ background: variantConfig.iconBg }}
        >
          <Icon className="w-6 h-6" style={{ color: variantConfig.iconColor }} />
        </div>

        {/* Content */}
        <h3
          id="confirm-dialog-title"
          className="text-base font-bold text-[var(--text-primary)] mb-2"
        >
          {title}
        </h3>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
          {message}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 text-sm font-semibold text-[var(--text-secondary)] bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] rounded-xl transition-colors border border-[var(--border-subtle)]"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`flex-1 py-2.5 px-4 text-sm font-bold text-white bg-gradient-to-r ${variantConfig.btnBg} rounded-xl shadow-lg ${variantConfig.shadow} hover:shadow-xl hover:-translate-y-0.5 transition-all`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
