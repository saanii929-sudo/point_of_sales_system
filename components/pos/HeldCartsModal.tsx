'use client';

import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getHeldCarts, resumeCart, deleteHeldCart } from '@/lib/indexedDB';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface HeldCartsModalProps {
  onClose: () => void;
  onResume: (cart: any) => void;
}

export function HeldCartsModal({ onClose, onResume }: HeldCartsModalProps) {
  const [heldCarts, setHeldCarts] = useState<any[]>([]);

  useEffect(() => {
    loadHeldCarts();
  }, []);

  const loadHeldCarts = async () => {
    const carts = await getHeldCarts();
    setHeldCarts(carts);
  };

  const handleResume = async (id: string) => {
    const cart = await resumeCart(id);
    if (cart) {
      onResume(cart);
      toast.success('Cart resumed');
      onClose();
    }
  };

  const handleDelete = async (id: string) => {
    await deleteHeldCart(id);
    toast.success('Cart deleted');
    loadHeldCarts();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <CardHeader>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Held Carts</h2>
            <button onClick={onClose} className="text-2xl">×</button>
          </div>
        </CardHeader>
        <CardBody className="overflow-y-auto">
          {heldCarts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-4xl mb-2">🛒</p>
              <p>No held carts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {heldCarts.map((cart) => (
                <div
                  key={cart.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">
                        {cart.items.length} items
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {format(cart.timestamp, 'MMM dd, yyyy HH:mm')}
                      </p>
                      {cart.customerInfo && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Customer: {cart.customerInfo.name}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleResume(cart.id)}
                      >
                        Resume
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(cart.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm space-y-1">
                    {cart.items.slice(0, 3).map((item: any, idx: number) => (
                      <div key={idx} className="text-gray-600 dark:text-gray-400">
                        {item.quantity}x {item.name}
                      </div>
                    ))}
                    {cart.items.length > 3 && (
                      <div className="text-gray-500">
                        +{cart.items.length - 3} more items
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
