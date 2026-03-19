'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { useCartStore } from '@/store/useCartStore';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useKeyboardShortcuts, POS_SHORTCUTS } from '@/hooks/useKeyboardShortcuts';
import { ReceiptPreview } from '@/components/pos/ReceiptPreview';
import { HeldCartsModal } from '@/components/pos/HeldCartsModal';
import { CalculatorModal } from '@/components/pos/CalculatorModal';
import { addOfflineSale, holdCart, syncOfflineSales } from '@/lib/indexedDB';
import toast from 'react-hot-toast';
import {
  Wifi, WifiOff, Package, ShoppingCart, User, FileText,
  X, CheckCircle2, Calculator, Search, Banknote, CreditCard,
  SplitSquareHorizontal, Minus, Plus, Tag, Zap, Layers,
  ChevronDown, ChevronUp, ScanBarcode
} from 'lucide-react';

interface Product {
  _id: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  category: { name: string; color: string };
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const [lastKeyTime, setLastKeyTime] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'split'>('cash');
  const [splitPayment, setSplitPayment] = useState({ cash: 0, card: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showHeldCarts, setShowHeldCarts] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', email: '' });
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showCustomer, setShowCustomer] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');

  const isOnline = useOnlineStatus();
  const { items, addItem, removeItem, updateQuantity, clearCart, getSubtotal, getTax, getTotal } = useCartStore();

  useKeyboardShortcuts(POS_SHORTCUTS, true);

  useEffect(() => {
    fetchProducts();
    if (isOnline) {
      syncOfflineSales().then((results) => {
        const synced = results.filter((r: any) => r.success).length;
        if (synced > 0) toast.success(`Synced ${synced} offline sale${synced > 1 ? 's' : ''}`);
      });
    }
  }, [search, isOnline]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const now = Date.now();
      if (now - lastKeyTime > 100) setBarcodeBuffer('');
      setLastKeyTime(now);
      if (e.key === 'Enter' && barcodeBuffer.length >= 8) {
        handleBarcodeScanned(barcodeBuffer);
        setBarcodeBuffer('');
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setBarcodeBuffer((prev) => prev + e.key);
      }
    };
    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [barcodeBuffer, lastKeyTime]);

  const handleBarcodeScanned = async (barcode: string) => {
    try {
      const res = await fetch(`/api/products?barcode=${barcode}`);
      const data = await res.json();
      if (data.products?.length > 0) {
        handleAddToCart(data.products[0]);
        toast.success(`Scanned: ${data.products[0].name}`);
      } else {
        toast.error('Product not found');
      }
    } catch { toast.error('Scan failed'); }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/products?search=${search}`);
      const data = await res.json();
      setProducts(data.products || []);
    } catch { toast.error('Failed to load products'); }
  };

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) { toast.error('Out of stock'); return; }
    addItem({ id: product._id, name: product.name, price: product.price, cost: product.cost, quantity: 1, stock: product.stock });
  };

  const handleHoldCart = async () => {
    if (!items.length) { toast.error('Cart is empty'); return; }
    try {
      await holdCart({ items, discount: getDiscountAmount() });
      toast.success('Cart held');
      clearCart(); setAppliedDiscount(null); setDiscountCode('');
    } catch { toast.error('Failed to hold cart'); }
  };

  const handleResumeCart = (cart: any) => {
    clearCart();
    cart.items.forEach((item: any) => addItem(item));
  };

  const handleCheckout = async () => {
    if (!items.length) { toast.error('Cart is empty'); return; }
    if (paymentMethod === 'split') {
      const total = getFinalTotal();
      if (Math.abs(splitPayment.cash + splitPayment.card - total) > 0.01) {
        toast.error('Split amounts must equal total'); return;
      }
    }
    setIsProcessing(true);

    const saleData = {
      items,
      subtotal: getSubtotal(),
      total: getTotal(),
      discount: getDiscountAmount(),
      discountCode: appliedDiscount?.code || null,
      discountId: appliedDiscount?.id || null,
      tax: getTax(),
      paymentMethod,
      paymentDetails:
        paymentMethod === 'split' ? splitPayment
        : paymentMethod === 'cash' ? { cash: getTotal() }
        : { card: getTotal() },
      customerInfo: customerInfo.phone ? customerInfo : undefined,
    };

    try {
      if (!isOnline) {
        await addOfflineSale(saleData);
        toast.success('Saved offline — will sync when online');
        setLastSale({ ...saleData, total: getTotal(), subtotal: getSubtotal(), items: items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })), discountCode: appliedDiscount?.code });
        setShowReceipt(true);
        clearCart(); setCustomerInfo({ name: '', phone: '', email: '' }); setAppliedDiscount(null); setDiscountCode('');
      } else {
        const res = await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(saleData),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
        const data = await res.json();
        toast.success(`Sale complete! #${data.sale.saleNumber}`);
        setLastSale({ ...saleData, total: getTotal(), subtotal: getSubtotal(), saleNumber: data.sale.saleNumber, items: items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })), discountCode: appliedDiscount?.code });
        setShowReceipt(true);
        clearCart(); setCustomerInfo({ name: '', phone: '', email: '' }); setAppliedDiscount(null); setDiscountCode('');
        fetchProducts();
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const applyDiscount = async () => {
    if (!discountCode.trim()) { toast.error('Enter a discount code'); return; }
    setIsApplyingDiscount(true);
    try {
      const res = await fetch('/api/discounts/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: discountCode, subtotal: getSubtotal(), items: items.map((i) => ({ product: i.id, price: i.price, quantity: i.quantity })), customerId: null }),
      });
      const data = await res.json();
      if (data.valid) { setAppliedDiscount(data.discount); toast.success(`Discount applied: ${data.discount.name}`); }
      else toast.error(data.error || 'Invalid code');
    } catch { toast.error('Failed to verify code'); }
    finally { setIsApplyingDiscount(false); }
  };

  const removeDiscount = () => { setAppliedDiscount(null); setDiscountCode(''); };
  const getDiscountAmount = () => appliedDiscount?.amount ?? 0;
  const getFinalTotal = () => getTotal() - getDiscountAmount();
  const handlePrintReceipt = () => { window.print(); setShowReceipt(false); };

  const categories = useMemo(() => [...new Set(products.map((p) => p.category.name))], [products]);

  const filteredProducts = useMemo(() =>
    products.filter((p) => !categoryFilter || p.category.name === categoryFilter),
    [products, categoryFilter]
  );

  const cartCount = items.reduce((s, i) => s + i.quantity, 0);
  const hasCustomer = customerInfo.name || customerInfo.phone;

  return (
    <div className="h-[calc(100vh-4.5rem)] flex flex-col lg:flex-row gap-4 overflow-hidden">

      <div className="fixed top-[72px] right-5 z-50">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${
          isOnline
            ? 'bg-emerald-500 text-white'
            : 'bg-red-500 text-white'
        }`}>
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      <div className="flex-1 flex flex-col min-h-0 min-w-0">

        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" />
            <input
              type="text"
              placeholder="Search products or scan barcode… (Ctrl+F)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all"
            />
            <ScanBarcode className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          </div>
          <button
            onClick={() => setShowHeldCarts(true)}
            data-action="resume"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all whitespace-nowrap"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Held Carts</span>
          </button>
        </div>

        {categories.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setCategoryFilter('')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                !categoryFilter
                  ? 'bg-[var(--primary-color)] text-white'
                  : 'bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
              }`}
            >
              All
            </button>
            {categories.map((cat) => {
              const catColor = products.find((p) => p.category.name === cat)?.category.color;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat === categoryFilter ? '' : cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                    categoryFilter === cat
                      ? 'text-white'
                      : 'bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                  }`}
                  style={categoryFilter === cat ? { backgroundColor: catColor } : {}}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex-1 overflow-y-auto pr-1">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[var(--bg-surface-3)] flex items-center justify-center">
                <Package className="w-6 h-6 text-[var(--text-tertiary)]" />
              </div>
              <p className="text-sm text-[var(--text-secondary)]">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
                const outOfStock = product.stock <= 0;
                const lowStock = !outOfStock && product.stock <= 10;
                const inCart = items.find((i) => i.id === product._id);

                return (
                  <button
                    key={product._id}
                    onClick={() => handleAddToCart(product)}
                    disabled={outOfStock}
                    className={`relative text-left rounded-2xl border-2 transition-all duration-150 overflow-hidden group ${
                      outOfStock
                        ? 'border-[var(--border-subtle)] opacity-50 cursor-not-allowed'
                        : inCart
                        ? 'border-[var(--primary-color)] bg-[var(--brand-50)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--primary-color)]/50 hover:shadow-md hover:-translate-y-0.5'
                    }`}
                  >
                    <div className="p-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold mb-2.5"
                        style={{ backgroundColor: product.category.color + 'cc' }}
                      >
                        {getInitials(product.name)}
                      </div>

                      <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight line-clamp-2 mb-1.5">
                        {product.name}
                      </p>

                      <div className="flex items-end justify-between gap-1">
                        <p className="text-base font-bold text-[var(--primary-color)] tabular-nums leading-none">
                          GH₵{product.price.toFixed(2)}
                        </p>
                        <p className={`text-xs font-medium leading-none ${
                          outOfStock ? 'text-red-500' : lowStock ? 'text-amber-500' : 'text-[var(--text-tertiary)]'
                        }`}>
                          {outOfStock ? 'Out' : `${product.stock}`}
                        </p>
                      </div>
                    </div>
                    {inCart && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--primary-color)] text-white text-[10px] font-bold flex items-center justify-center">
                        {inCart.quantity}
                      </div>
                    )}
                    {outOfStock && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-surface)]/60 rounded-2xl">
                        <span className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-950/40 px-2 py-1 rounded-full border border-red-200 dark:border-red-800">
                          Out of Stock
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center gap-4 px-3 py-2 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] overflow-x-auto">
          <p className="text-xs font-semibold text-[var(--text-tertiary)] whitespace-nowrap flex-shrink-0">Shortcuts:</p>
          {[
            ['Ctrl+F', 'Search'],
            ['Ctrl+↵', 'Checkout'],
            ['Ctrl+H', 'Hold'],
            ['Ctrl+R', 'Resume'],
            ['Ctrl+P', 'Print'],
            ['Ctrl+⇧+C', 'Calc'],
            ['ESC', 'Clear'],
          ].map(([key, label]) => (
            <span key={key} className="text-xs text-[var(--text-tertiary)] whitespace-nowrap flex-shrink-0">
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface-3)] border border-[var(--border-default)] font-mono text-[10px] font-medium text-[var(--text-secondary)]">{key}</kbd>
              {' '}{label}
            </span>
          ))}
        </div>
      </div>
      <div className="w-full lg:w-[360px] xl:w-[380px] flex flex-col min-h-0 flex-shrink-0">
        <Card className="flex-1 flex flex-col overflow-hidden">

          {/* Panel header */}
          <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <ShoppingCart className="w-5 h-5 text-[var(--primary-color)]" />
              <h2 className="text-base font-bold text-[var(--text-primary)]">Current Order</h2>
              {cartCount > 0 && (
                <span className="w-6 h-6 rounded-full bg-[var(--primary-color)] text-white text-xs font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowCalculator(true)}
                disabled={!items.length}
                data-action="calculator"
                className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-3)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Calculator (Ctrl+Shift+C)"
              >
                <Calculator className="w-4 h-4" />
              </button>
              <button
                onClick={() => { clearCart(); setAppliedDiscount(null); setDiscountCode(''); }}
                disabled={!items.length}
                data-action="clear"
                className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Clear cart (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto">

            {/* ── Cart items ── */}
            <div className="px-4 py-3">
              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--bg-surface-3)] flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-[var(--text-tertiary)]" />
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">Add products from the left</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{item.name}</p>
                        <p className="text-xs text-[var(--text-tertiary)] tabular-nums">
                          GH₵{item.price.toFixed(2)} × {item.quantity}
                          {' = '}
                          <span className="font-semibold text-[var(--text-secondary)]">GH₵{(item.price * item.quantity).toFixed(2)}</span>
                        </p>
                      </div>

                      {/* Qty stepper */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 rounded-lg bg-[var(--bg-surface-3)] hover:bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-primary)] flex items-center justify-center transition-all"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center text-sm font-bold text-[var(--text-primary)] tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          className="w-7 h-7 rounded-lg bg-[var(--primary-color)] hover:opacity-90 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="w-7 h-7 rounded-lg text-[var(--text-tertiary)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center transition-all flex-shrink-0 opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <>
                {/* ── Customer (collapsible) ── */}
                <div className="mx-4 mb-2 rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                  <button
                    onClick={() => setShowCustomer((v) => !v)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] transition-colors"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)]">
                      <User className="w-3.5 h-3.5" />
                      Customer
                      {hasCustomer && (
                        <span className="w-2 h-2 rounded-full bg-[var(--primary-color)]" />
                      )}
                      <span className="text-xs font-normal text-[var(--text-tertiary)]">(optional)</span>
                    </div>
                    {showCustomer ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-tertiary)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />}
                  </button>

                  {showCustomer && (
                    <div className="px-3.5 py-3 space-y-2 border-t border-[var(--border-subtle)]">
                      {[
                        { key: 'name', placeholder: 'Customer name', type: 'text' },
                        { key: 'phone', placeholder: 'Phone number', type: 'tel' },
                        { key: 'email', placeholder: 'Email (optional)', type: 'email' },
                      ].map(({ key, placeholder, type }) => (
                        <input
                          key={key}
                          type={type}
                          placeholder={placeholder}
                          value={customerInfo[key as keyof typeof customerInfo]}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, [key]: e.target.value })}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all"
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Discount ── */}
                <div className="mx-4 mb-2">
                  {appliedDiscount ? (
                    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{appliedDiscount.name}</p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">−GH₵{appliedDiscount.amount.toFixed(2)}</p>
                        </div>
                      </div>
                      <button onClick={removeDiscount} className="p-1 rounded-lg text-emerald-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)] pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Discount code"
                          value={discountCode}
                          onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                          className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all uppercase tracking-wider"
                        />
                      </div>
                      <button
                        onClick={applyDiscount}
                        disabled={!discountCode || isApplyingDiscount}
                        className="px-3 py-2 rounded-xl text-sm font-semibold bg-[var(--bg-surface-3)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        {isApplyingDiscount ? '…' : 'Apply'}
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Payment method ── */}
                <div className="mx-4 mb-3">
                  <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Payment</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { value: 'cash', label: 'Cash', Icon: Banknote },
                        { value: 'card', label: 'Card', Icon: CreditCard },
                        { value: 'split', label: 'Split', Icon: SplitSquareHorizontal },
                      ] as const
                    ).map(({ value, label, Icon }) => (
                      <button
                        key={value}
                        onClick={() => setPaymentMethod(value)}
                        className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                          paymentMethod === value
                            ? 'border-[var(--primary-color)] bg-[var(--brand-50)] text-[var(--primary-color)]'
                            : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Split inputs */}
                  {paymentMethod === 'split' && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">Cash</label>
                        <input
                          type="number" min="0" step="0.01"
                          value={splitPayment.cash}
                          onChange={(e) => setSplitPayment({ ...splitPayment, cash: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-sm rounded-xl border-2 border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">Card</label>
                        <input
                          type="number" min="0" step="0.01"
                          value={splitPayment.card}
                          onChange={(e) => setSplitPayment({ ...splitPayment, card: Number(e.target.value) })}
                          className="w-full px-3 py-2 text-sm rounded-xl border-2 border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]/20 focus:border-[var(--primary-color)] transition-all tabular-nums"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Order totals ── */}
                <div className="mx-4 mb-3 rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                  <div className="px-4 py-2.5 flex justify-between text-sm border-b border-[var(--border-subtle)]">
                    <span className="text-[var(--text-secondary)]">Subtotal</span>
                    <span className="font-semibold text-[var(--text-primary)] tabular-nums">GH₵{getSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="px-4 py-2.5 flex justify-between text-sm border-b border-[var(--border-subtle)]">
                    <span className="text-[var(--text-secondary)]">Tax</span>
                    <span className="font-semibold text-[var(--text-primary)] tabular-nums">GH₵{getTax().toFixed(2)}</span>
                  </div>
                  {appliedDiscount && (
                    <div className="px-4 py-2.5 flex justify-between text-sm border-b border-[var(--border-subtle)]">
                      <span className="text-emerald-600 dark:text-emerald-400">Discount ({appliedDiscount.code})</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">−GH₵{getDiscountAmount().toFixed(2)}</span>
                    </div>
                  )}
                  <div className="px-4 py-3 flex justify-between items-center bg-[var(--bg-surface-2)]">
                    <span className="text-base font-bold text-[var(--text-primary)]">Total</span>
                    <span className="text-2xl font-bold text-[var(--primary-color)] tabular-nums">GH₵{getFinalTotal().toFixed(2)}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Checkout footer ── */}
          <div className="px-4 pb-4 pt-2 flex-shrink-0 border-t border-[var(--border-subtle)] space-y-2">
            <button
              onClick={handleCheckout}
              disabled={!items.length || isProcessing}
              data-action="checkout"
              className="w-full py-3.5 rounded-xl font-bold text-base text-white bg-[var(--primary-color)] hover:opacity-90 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-[var(--shadow-brand)]"
            >
              {isProcessing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Charge GH₵{items.length ? getFinalTotal().toFixed(2) : '0.00'}
                </>
              )}
            </button>

            <button
              onClick={handleHoldCart}
              disabled={!items.length}
              data-action="hold"
              className="w-full py-2.5 rounded-xl font-semibold text-sm text-[var(--text-secondary)] border border-[var(--border-default)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <Layers className="w-4 h-4" />
              Hold Order
            </button>
          </div>
        </Card>
      </div>

      {/* ── Modals ── */}
      {showReceipt && lastSale && (
        <ReceiptPreview
          items={lastSale.items}
          subtotal={lastSale.subtotal}
          tax={lastSale.tax}
          discount={lastSale.discount}
          discountCode={lastSale.discountCode}
          total={lastSale.total}
          paymentMethod={lastSale.paymentMethod}
          onClose={() => setShowReceipt(false)}
          onPrint={handlePrintReceipt}
        />
      )}
      {showHeldCarts && (
        <HeldCartsModal onClose={() => setShowHeldCarts(false)} onResume={handleResumeCart} />
      )}
      {showCalculator && (
        <CalculatorModal
          total={getFinalTotal()}
          onClose={() => setShowCalculator(false)}
          onConfirm={(paid: number, change: number) => {
            toast.success(`Paid GH₵${paid.toFixed(2)} · Change GH₵${change.toFixed(2)}`);
          }}
        />
      )}
    </div>
  );
}
