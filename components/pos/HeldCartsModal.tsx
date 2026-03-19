'use client';

import { useEffect, useState } from 'react';
import { getHeldCarts, resumeCart, deleteHeldCart } from '@/lib/indexedDB';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Layers, RotateCcw, Trash2, X, Clock } from 'lucide-react';

interface HeldCartsModalProps {
  onClose:  () => void;
  onResume: (cart: any) => void;
}

export function HeldCartsModal({ onClose, onResume }: HeldCartsModalProps) {
  const [heldCarts, setHeldCarts] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => { loadCarts(); }, []);

  const loadCarts = async () => {
    setLoading(true);
    try {
      setHeldCarts(await getHeldCarts());
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async (id: string) => {
    const cart = await resumeCart(id);
    if (cart) { onResume(cart); toast.success('Cart resumed'); onClose(); }
  };

  const handleDelete = async (id: string) => {
    await deleteHeldCart(id);
    toast.success('Cart discarded');
    setHeldCarts(c => c.filter(x => x.id !== id));
  };

  const cartTotal = (items: any[]) =>
    items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-xl bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl shadow-[var(--shadow-floating)] overflow-hidden flex flex-col max-h-[80vh] ">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))' }}>
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Held Carts</h2>
              {!loading && heldCarts.length > 0 && (
                <p className="text-xs text-[var(--text-tertiary)]">{heldCarts.length} cart{heldCarts.length > 1 ? 's' : ''} waiting</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-3">
              {[1,2].map(i => (
                <div key={i} className="skeleton h-24 rounded-xl" />
              ))}
            </div>
          ) : heldCarts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[var(--bg-surface-3)] flex items-center justify-center">
                <Layers className="w-7 h-7 text-[var(--text-tertiary)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--text-secondary)]">No held carts</p>
              <p className="text-xs text-[var(--text-tertiary)]">Hold a cart to save it for later</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {heldCarts.map(cart => {
                const total      = cartTotal(cart.items);
                const itemsLabel = `${cart.items.length} item${cart.items.length > 1 ? 's' : ''}`;
                return (
                  <div
                    key={cart.id}
                    className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-2)] hover:border-[var(--border-default)] transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-bold text-[var(--text-primary)]">{itemsLabel}</p>
                          <span className="text-sm font-bold text-[var(--primary-color)] tabular-nums">
                            GH₵{total.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                          <Clock className="w-3 h-3" />
                          <span>{format(cart.timestamp, 'MMM dd, hh:mm a')}</span>
                        </div>
                        {cart.customerInfo?.name && (
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            Customer: {cart.customerInfo.name}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleResume(cart.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary-color)] text-white text-xs font-bold hover:opacity-90 transition-all shadow-[var(--shadow-brand)]"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Resume
                        </button>
                        <button
                          onClick={() => handleDelete(cart.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all opacity-0 group-hover:opacity-100"
                          title="Discard cart"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Item preview */}
                    <div className="flex flex-wrap gap-1.5">
                      {cart.items.slice(0, 4).map((item: any, idx: number) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bg-surface-3)] text-xs text-[var(--text-secondary)]"
                        >
                          <span className="font-bold text-[var(--text-primary)]">{item.quantity}×</span>
                          {item.name}
                        </span>
                      ))}
                      {cart.items.length > 4 && (
                        <span className="px-2 py-0.5 rounded-full bg-[var(--bg-surface-3)] text-xs text-[var(--text-tertiary)]">
                          +{cart.items.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
