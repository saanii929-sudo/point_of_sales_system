'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody } from '@/components/ui/Card';

interface Command {
  id: string;
  label: string;
  action: () => void;
  keywords: string[];
  icon: string;
}

export function CommandPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filteredCommands, setFilteredCommands] = useState<Command[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: Command[] = [
    {
      id: 'goto-dashboard',
      label: 'Go to Dashboard',
      action: () => router.push('/dashboard'),
      keywords: ['dashboard', 'home', 'overview'],
      icon: '📊'
    },
    {
      id: 'goto-pos',
      label: 'Go to POS Terminal',
      action: () => router.push('/dashboard/pos'),
      keywords: ['pos', 'sell', 'checkout', 'terminal'],
      icon: '🛒'
    },
    {
      id: 'goto-products',
      label: 'Go to Products',
      action: () => router.push('/dashboard/products'),
      keywords: ['products', 'inventory', 'items'],
      icon: '📦'
    },
    {
      id: 'goto-sales',
      label: 'Go to Sales',
      action: () => router.push('/dashboard/sales'),
      keywords: ['sales', 'transactions', 'history'],
      icon: '💰'
    },
    {
      id: 'goto-customers',
      label: 'Go to Customers',
      action: () => router.push('/dashboard/customers'),
      keywords: ['customers', 'clients', 'buyers'],
      icon: '👥'
    },
    {
      id: 'goto-employees',
      label: 'Go to Employees',
      action: () => router.push('/dashboard/employees'),
      keywords: ['employees', 'staff', 'team'],
      icon: '👤'
    },
    {
      id: 'goto-reports',
      label: 'Go to Reports',
      action: () => router.push('/dashboard/reports'),
      keywords: ['reports', 'analytics', 'insights'],
      icon: '📈'
    }
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }

      // Escape to close
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearch('');
      }

      // Arrow navigation
      if (isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            setIsOpen(false);
            setSearch('');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex]);

  useEffect(() => {
    if (search) {
      const filtered = commands.filter(cmd =>
        cmd.label.toLowerCase().includes(search.toLowerCase()) ||
        cmd.keywords.some(kw => kw.toLowerCase().includes(search.toLowerCase()))
      );
      setFilteredCommands(filtered);
      setSelectedIndex(0);
    } else {
      setFilteredCommands(commands);
    }
  }, [search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-32 px-4">
      <Card className="w-full max-w-2xl">
        <CardBody className="p-0">
          <input
            type="text"
            placeholder="Type a command or search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-6 py-4 text-lg border-b border-gray-200 dark:border-gray-700 bg-transparent focus:outline-none"
            autoFocus
          />
          <div className="max-h-96 overflow-y-auto">
            {filteredCommands.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No commands found
              </div>
            ) : (
              filteredCommands.map((cmd, index) => (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full px-6 py-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                    index === selectedIndex ? 'bg-gray-100 dark:bg-gray-800' : ''
                  }`}
                >
                  <span className="text-2xl">{cmd.icon}</span>
                  <span className="font-medium">{cmd.label}</span>
                </button>
              ))
            )}
          </div>
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 flex items-center gap-4">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
