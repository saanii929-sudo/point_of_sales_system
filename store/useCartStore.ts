import { create } from 'zustand';

interface CartItem {
  id: string;
  name: string;
  price: number;
  cost: number;
  quantity: number;
  stock: number;
}

interface CartState {
  items: CartItem[];
  discount: number;
  taxRate: number;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  setDiscount: (discount: number) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTax: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  discount: 0,
  taxRate: 0,
  
  addItem: (item) => set((state) => {
    const existing = state.items.find(i => i.id === item.id);
    if (existing) {
      return {
        items: state.items.map(i =>
          i.id === item.id
            ? { ...i, quantity: Math.min(i.quantity + 1, i.stock) }
            : i
        )
      };
    }
    return { items: [...state.items, { ...item, quantity: 1 }] };
  }),
  
  removeItem: (id) => set((state) => ({
    items: state.items.filter(i => i.id !== id)
  })),
  
  updateQuantity: (id, quantity) => set((state) => ({
    items: state.items.map(i =>
      i.id === id ? { ...i, quantity: Math.min(Math.max(1, quantity), i.stock) } : i
    )
  })),
  
  setDiscount: (discount) => set({ discount }),
  
  clearCart: () => set({ items: [], discount: 0 }),
  
  getSubtotal: () => {
    const { items } = get();
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  },
  
  getTax: () => {
    const { taxRate } = get();
    return get().getSubtotal() * (taxRate / 100);
  },
  
  getTotal: () => {
    const { discount } = get();
    return get().getSubtotal() + get().getTax() - discount;
  }
}));
