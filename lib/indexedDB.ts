// IndexedDB for offline sales queue
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineSale {
  id: string;
  items: any[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentDetails: any;
  customerInfo?: any;
  timestamp: number;
  synced: boolean;
}

interface PosDB extends DBSchema {
  'offline-sales': {
    key: string;
    value: OfflineSale;
    indexes: { 'by-synced': boolean };
  };
  'held-carts': {
    key: string;
    value: {
      id: string;
      items: any[];
      discount: number;
      customerInfo?: any;
      timestamp: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<PosDB>> | null = null;

export async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<PosDB>('pos-system', 1, {
      upgrade(db) {
        // Offline sales store
        const offlineSalesStore = db.createObjectStore('offline-sales', {
          keyPath: 'id'
        });
        offlineSalesStore.createIndex('by-synced', 'synced');

        // Held carts store
        db.createObjectStore('held-carts', {
          keyPath: 'id'
        });
      }
    });
  }
  return dbPromise;
}

// Offline Sales Queue
export async function addOfflineSale(sale: Omit<OfflineSale, 'id' | 'synced' | 'timestamp'>) {
  const db = await getDB();
  const id = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  await db.add('offline-sales', {
    ...sale,
    id,
    timestamp: Date.now(),
    synced: false
  });
  
  return id;
}

export async function getOfflineSales() {
  const db = await getDB();
  const allSales = await db.getAll('offline-sales');
  // Filter for unsynced sales
  return allSales.filter(sale => !sale.synced);
}

export async function markSaleSynced(id: string) {
  const db = await getDB();
  const sale = await db.get('offline-sales', id);
  if (sale) {
    sale.synced = true;
    await db.put('offline-sales', sale);
  }
}

export async function deleteOfflineSale(id: string) {
  const db = await getDB();
  await db.delete('offline-sales', id);
}

// Held Carts
export async function holdCart(cart: { items: any[]; discount: number; customerInfo?: any }) {
  const db = await getDB();
  const id = `cart-${Date.now()}`;
  
  await db.add('held-carts', {
    id,
    ...cart,
    timestamp: Date.now()
  });
  
  return id;
}

export async function getHeldCarts() {
  const db = await getDB();
  return db.getAll('held-carts');
}

export async function resumeCart(id: string) {
  const db = await getDB();
  const cart = await db.get('held-carts', id);
  if (cart) {
    await db.delete('held-carts', id);
  }
  return cart;
}

export async function deleteHeldCart(id: string) {
  const db = await getDB();
  await db.delete('held-carts', id);
}

// Sync offline sales
export async function syncOfflineSales() {
  try {
    const offlineSales = await getOfflineSales();
    const results = [];

    for (const sale of offlineSales) {
      try {
        const response = await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: sale.items,
            discount: sale.discount,
            tax: sale.tax,
            paymentMethod: sale.paymentMethod,
            paymentDetails: sale.paymentDetails,
            customerInfo: sale.customerInfo,
            isOfflineSync: true,
            offlineTimestamp: sale.timestamp
          })
        });

        if (response.ok) {
          await markSaleSynced(sale.id);
          results.push({ id: sale.id, success: true });
        } else {
          results.push({ id: sale.id, success: false, error: 'API error' });
        }
      } catch (error) {
        results.push({ id: sale.id, success: false, error: 'Network error' });
      }
    }

    return results;
  } catch (error) {
    console.error('Sync error:', error);
    return [];
  }
}
