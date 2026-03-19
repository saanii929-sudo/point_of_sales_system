import { type ClassValue, clsx } from 'clsx';
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
}

export function generateSaleNumber(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `SALE-${timestamp}-${random}`.toUpperCase();
}

export function generateSKU(name: string): string {
  const prefix = name.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString(36).substring(-4);
  const random = Math.random().toString(36).substring(2, 5);
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
}

export function calculateProfit(items: Array<{ quantity: number; price: number; cost: number }>): number {
  return items.reduce((total, item) => {
    return total + (item.quantity * (item.price - item.cost));
  }, 0);
}

export function isLowStock(stock: number, threshold: number): boolean {
  return stock <= threshold && stock > 0;
}

export function isOutOfStock(stock: number): boolean {
  return stock <= 0;
}
