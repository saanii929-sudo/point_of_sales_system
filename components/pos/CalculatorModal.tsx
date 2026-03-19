'use client';

import { useState, useEffect } from 'react';
import { X, Calculator, ArrowRight } from 'lucide-react';

interface CalculatorModalProps {
  total: number;
  onClose: () => void;
  onConfirm?: (amountPaid: number, change: number) => void;
}

export function CalculatorModal({ total, onClose, onConfirm }: CalculatorModalProps) {
  const [display, setDisplay] = useState('0');
  const [amountPaid, setAmountPaid] = useState(0);
  const [change,     setChange]     = useState(0);

  useEffect(() => {
    const paid = parseFloat(display) || 0;
    setAmountPaid(paid);
    setChange(Math.max(0, paid - total));
  }, [display, total]);

  const append    = (ch: string) => setDisplay(d => d === '0' ? ch : d + ch);
  const decimal   = ()           => setDisplay(d => d.includes('.') ? d : d + '.');
  const backspace = ()           => setDisplay(d => d.length === 1 ? '0' : d.slice(0, -1));
  const clear     = ()           => setDisplay('0');
  const quickSet  = (n: number)  => setDisplay(String(n));

  const handleConfirm = () => {
    if (amountPaid >= total && onConfirm) onConfirm(amountPaid, change);
    onClose();
  };

  const fmt = (n: number) => `GH₵${n.toFixed(2)}`;
  const sufficient = amountPaid >= total;
  const quickAmounts = [5, 10, 20, 50, 100, Math.ceil(total / 10) * 10];

  // shared button classes
  const numBtn  = 'py-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-default)] hover:bg-[var(--bg-surface-3)] font-bold text-sm text-[var(--text-primary)] transition-all active:scale-95';
  const iconBtn = (colour: string) =>
    `py-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-default)] ${colour} font-bold text-sm transition-all active:scale-95`;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end justify-end z-50 p-4 pointer-events-none">
      <div className="pointer-events-auto">
        <div className="w-[360px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl shadow-[var(--shadow-floating)] overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))' }}>
                <Calculator className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Cash Calculator</h2>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--text-tertiary)] hover:text-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            {/* Total */}
            <div className="px-4 py-3 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-subtle)]">
              <p className="text-xs text-[var(--text-tertiary)] mb-0.5">Order Total</p>
              <p className="text-xl font-bold text-[var(--primary-color)] tabular-nums">{fmt(total)}</p>
            </div>

            {/* Amount paid display */}
            <div className="px-4 py-3 rounded-xl bg-[var(--bg-surface-2)] border-2 border-[var(--border-default)] focus-within:border-[var(--primary-color)] transition-colors">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">Amount Tendered</p>
              <p className="text-3xl font-bold tabular-nums text-gradient tracking-tight">
                GH₵{display}
              </p>
            </div>

            {/* Change display */}
            <div className={`px-4 py-3 rounded-xl border-2 transition-all ${
              sufficient
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-[var(--text-tertiary)] mb-0.5">Change Due</p>
                  <p className={`text-2xl font-bold tabular-nums ${
                    sufficient ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {fmt(change)}
                  </p>
                </div>
                {!sufficient && (
                  <div className="text-right">
                    <p className="text-xs text-[var(--text-tertiary)]">Still needed</p>
                    <p className="text-sm font-bold text-red-600 dark:text-red-400 tabular-nums">
                      {fmt(total - amountPaid)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick amounts */}
            <div>
              <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">
                Quick Amounts
              </p>
              <div className="grid grid-cols-6 gap-1.5">
                {quickAmounts.map((amt, i) => (
                  <button
                    key={`${amt}-${i}`}
                    onClick={() => quickSet(amt)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                      i === quickAmounts.length - 1
                        ? 'bg-[var(--primary-color)] text-white hover:opacity-90'
                        : 'bg-[var(--bg-surface-2)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-3)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Number pad */}
            <div className="grid grid-cols-4 gap-1.5">
              {['7','8','9'].map(n => <button key={n} onClick={() => append(n)} className={numBtn}>{n}</button>)}
              <button onClick={backspace} className={iconBtn('hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500')}>⌫</button>

              {['4','5','6'].map(n => <button key={n} onClick={() => append(n)} className={numBtn}>{n}</button>)}
              <button onClick={clear} className={iconBtn('hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-600')}>C</button>

              {['1','2','3'].map(n => <button key={n} onClick={() => append(n)} className={numBtn}>{n}</button>)}
              <button
                onClick={() => quickSet(total)}
                className={iconBtn('hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-600 text-xs')}
              >
                Exact
              </button>

              <button onClick={() => append('0')} className={`col-span-2 ${numBtn}`}>0</button>
              <button onClick={decimal} className={numBtn}>.</button>
              <button
                onClick={handleConfirm}
                disabled={!sufficient}
                className={`py-3 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center ${
                  sufficient
                    ? 'bg-[var(--primary-color)] text-white hover:opacity-90 shadow-[var(--shadow-brand)]'
                    : 'bg-[var(--bg-surface-3)] text-[var(--text-tertiary)] cursor-not-allowed'
                }`}
              >
                {sufficient ? <ArrowRight className="w-4 h-4" /> : '—'}
              </button>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={onClose}
                className="py-2.5 rounded-xl border border-[var(--border-default)] text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!sufficient}
                className="py-2.5 rounded-xl text-sm font-bold text-white bg-[var(--primary-color)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[var(--shadow-brand)]"
              >
                {sufficient ? 'Confirm' : 'Insufficient'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
