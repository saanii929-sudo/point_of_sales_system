'use client';

import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCartStore } from '@/store/useCartStore';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useKeyboardShortcuts, POS_SHORTCUTS } from '@/hooks/useKeyboardShortcuts';
import { ReceiptPreview } from '@/components/pos/ReceiptPreview';
import { HeldCartsModal } from '@/components/pos/HeldCartsModal';
import { addOfflineSale, holdCart, syncOfflineSales } from '@/lib/indexedDB';
import toast from 'react-hot-toast';

interface Product {
  _id: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  category: { name: string; color: string };
}

export default function EnhancedPOSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'split'>('cash');
  const [splitPayment, setSplitPayment] = useState({ cash: 0, card: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showHeldCarts, setShowHeldCarts] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);

  const isOnline = useOnlineStatus();
  const { items, addItem, removeItem, updateQuantity, clearCart, getSubtotal, getTax, getTotal, discount, setDiscount } = useCartStore();

  // Enable keyboard shortcuts
  useKeyboardShortcuts(POS_SHORTCUTS, true);

  useEffect(() => {
    fetchProducts();
    
    // Sync offline sales when coming back online
    if (isOnline) {
      syncOfflineSales().then(results => {
        const synced = results.filter(r => r.success).length;
        if (synced > 0) {
          toast.success(`Synced ${synced} offline sales`);
        }
      });
    }
  }, [search, isOnline]);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`/api/products?search=${search}`);
      const data = await res.json();
      setProducts(data.products || []);
    } catch (error) {
      toast.error('Failed to load products');
    }
  };

  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast.error('Product out of stock');
      return;
    }
    addItem({
      id: product._id,
      name: product.name,
      price: product.price,
      cost: product.cost,
      quantity: 1,
      stock: product.stock
    });
    toast.success(`${product.name} added`);
  };

  const handleHoldCart = async () => {
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    try {
      await holdCart({
        items,
        discount
      });
      toast.success('Cart held successfully');
      clearCart();
    } catch (error) {
      toast.error('Failed to hold cart');
    }
  };

  const handleResumeCart = (cart: any) => {
    clearCart();
    cart.items.forEach((item: any) => {
      addItem(item);
    });
    setDiscount(cart.discount || 0);
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    // Validate split payment
    if (paymentMethod === 'split') {
      const total = getTotal();
      if (splitPayment.cash + splitPayment.card !== total) {
        toast.error('Split payment amounts must equal total');
        return;
      }
    }

    setIsProcessing(true);

    const saleData = {
      items,
      subtotal: getSubtotal(),
      total: getTotal(),
      discount,
      tax: getTax(),
      paymentMethod,
      paymentDetails: paymentMethod === 'split'
        ? splitPayment
        : paymentMethod === 'cash'
          ? { cash: getTotal() }
          : { card: getTotal() }
    };

    try {
      if (!isOnline) {
        // Save to IndexedDB for later sync
        await addOfflineSale(saleData);
        toast.success('Sale saved offline - will sync when online');
        setLastSale({ ...saleData, total: getTotal(), subtotal: getSubtotal() });
        setShowReceipt(true);
        clearCart();
      } else {
        // Process online
        const res = await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(saleData)
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error);
        }

        const data = await res.json();
        toast.success(`Sale completed! #${data.sale.saleNumber}`);
        setLastSale({ ...saleData, total: getTotal(), subtotal: getSubtotal() });
        setShowReceipt(true);
        clearCart();
        fetchProducts(); // Refresh stock
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
    setShowReceipt(false);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      {/* Online/Offline Indicator */}
      <div className="fixed top-20 right-6 z-50">
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          isOnline 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}>
          {isOnline ? '🟢 Online' : '🔴 Offline'}
        </div>
      </div>

      {/* Products Grid */}
      <div className="flex-1 flex flex-col">
        <div className="mb-4 flex gap-2">
          <Input
            placeholder="Search products or scan barcode... (Ctrl+F)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-lg flex-1"
          />
          <Button
            variant="secondary"
            onClick={() => setShowHeldCarts(true)}
            data-action="resume"
          >
            📋 Held Carts
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <Card
                key={product._id}
                hover
                className="cursor-pointer"
                onClick={() => handleAddToCart(product)}
              >
                <CardBody className="p-4">
                  <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg mb-3 flex items-center justify-center text-4xl">
                    📦
                  </div>
                  <h3 className="font-semibold mb-1 truncate">{product.name}</h3>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-green-600">GH₵{product.price}</span>
                    <span className={`text-sm ${product.stock <= 10 ? 'text-red-600' : 'text-gray-500'}`}>
                      {product.stock} left
                    </span>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>

        {/* Keyboard Shortcuts Help */}
        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs">
          <p className="font-medium mb-1">Keyboard Shortcuts:</p>
          <div className="grid grid-cols-3 gap-2">
            <span>Ctrl+F: Search</span>
            <span>Ctrl+Enter: Checkout</span>
            <span>Ctrl+H: Hold Cart</span>
            <span>Ctrl+R: Resume Cart</span>
            <span>Ctrl+P: Print</span>
            <span>ESC: Clear Cart</span>
          </div>
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-96 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <h2 className="text-xl font-bold">Cart</h2>
          </CardHeader>

          <CardBody className="flex-1 flex flex-col">
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-2">
              {items.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p className="text-4xl mb-2">🛒</p>
                  <p>Cart is empty</p>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">GH₵{item.price}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Discount */}
            <div className="mb-4">
              <Input
                label="Discount (GH₵)"
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
              />
            </div>

            {/* Payment Method */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {(['cash', 'card', 'split'] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 rounded-lg font-medium ${
                      paymentMethod === method
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    {method.charAt(0).toUpperCase() + method.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Split Payment Details */}
            {paymentMethod === 'split' && (
              <div className="mb-4 grid grid-cols-2 gap-2">
                <Input
                  label="Cash Amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={splitPayment.cash}
                  onChange={(e) => setSplitPayment({ ...splitPayment, cash: Number(e.target.value) })}
                />
                <Input
                  label="Card Amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={splitPayment.card}
                  onChange={(e) => setSplitPayment({ ...splitPayment, card: Number(e.target.value) })}
                />
              </div>
            )}

            {/* Totals */}
            <div className="space-y-2 mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">GH₵{getSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span className="font-medium">GH₵{getTax().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount:</span>
                <span className="font-medium text-red-600">-GH₵{discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold pt-2 border-t border-gray-300 dark:border-gray-600">
                <span>Total:</span>
                <span className="text-green-600">GH₵{getTotal().toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-3 gap-2">
              <Button 
                variant="secondary" 
                onClick={clearCart} 
                disabled={items.length === 0}
                data-action="clear"
              >
                Clear
              </Button>
              <Button 
                variant="secondary" 
                onClick={handleHoldCart} 
                disabled={items.length === 0}
                data-action="hold"
              >
                Hold
              </Button>
              <Button 
                onClick={handleCheckout} 
                disabled={items.length === 0} 
                isLoading={isProcessing}
                data-action="checkout"
              >
                Checkout
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Receipt Preview Modal */}
      {showReceipt && lastSale && (
        <ReceiptPreview
          items={lastSale.items}
          subtotal={lastSale.subtotal}
          tax={lastSale.tax}
          discount={lastSale.discount}
          total={lastSale.total}
          paymentMethod={lastSale.paymentMethod}
          onClose={() => setShowReceipt(false)}
          onPrint={handlePrintReceipt}
        />
      )}

      {/* Held Carts Modal */}
      {showHeldCarts && (
        <HeldCartsModal
          onClose={() => setShowHeldCarts(false)}
          onResume={handleResumeCart}
        />
      )}
    </div>
  );
}
