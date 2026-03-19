'use client';

import { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { X, Calculator, DollarSign, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface CalculatorModalProps {
  total: number;
  onClose: () => void;
  onConfirm?: (amountPaid: number, change: number) => void;
}

export function CalculatorModal({ total, onClose, onConfirm }: CalculatorModalProps) {
  const [display, setDisplay] = useState('0');
  const [amountPaid, setAmountPaid] = useState(0);
  const [change, setChange] = useState(0);

  useEffect(() => {
    const paid = parseFloat(display) || 0;
    setAmountPaid(paid);
    setChange(Math.max(0, paid - total));
  }, [display, total]);

  const handleNumberClick = (num: string) => {
    if (display === '0') {
      setDisplay(num);
    } else {
      setDisplay(display + num);
    }
  };

  const handleDecimalClick = () => {
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handleClear = () => {
    setDisplay('0');
  };

  const handleBackspace = () => {
    if (display.length === 1) {
      setDisplay('0');
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  const handleQuickAmount = (amount: number) => {
    setDisplay(amount.toString());
  };

  const handleConfirm = () => {
    if (amountPaid >= total && onConfirm) {
      onConfirm(amountPaid, change);
    }
    onClose();
  };

  const quickAmounts = [5, 10, 20, 50, 100];
  const suggestedAmount = Math.ceil(total / 10) * 10; // Round up to nearest 10

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end justify-end z-50 p-4 pointer-events-none">
      <div className="pointer-events-auto">
        <Card className="w-[380px] max-h-[calc(100vh-2rem)] overflow-hidden glass-card shadow-2xl">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-gradient-r flex items-center justify-center">
                  <Calculator className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-bold gradient-text">Calculator</h2>
              </div>
              <button 
                onClick={onClose} 
                className="w-7 h-7 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-red-600" />
              </button>
            </div>
          </CardHeader>

          <CardBody className="space-y-3 overflow-y-auto max-h-[calc(100vh-8rem)]">
            {/* Total Amount */}
            <div className="p-3 glass-card rounded-lg border-2 border-primary/20">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">Total Amount</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(total)}</p>
            </div>

            {/* Display */}
            <div className="p-4 glass-card rounded-lg border-2 border-gray-300 dark:border-gray-600">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Amount Paid</p>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-gray-400" />
                <p className="text-3xl font-bold gradient-text font-mono tracking-tight">
                  {display}
                </p>
              </div>
            </div>

            {/* Change Display */}
            <div 
              className={`p-3 rounded-lg transition-all ${
                amountPaid >= total 
                  ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-300 dark:border-green-700' 
                  : 'bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-2 border-red-300 dark:border-red-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Change</p>
                  <p className={`text-2xl font-bold ${
                    amountPaid >= total ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {formatCurrency(change)}
                  </p>
                </div>
                {amountPaid < total && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Needed</p>
                    <p className="text-base font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(total - amountPaid)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Quick Amounts</p>
              <div className="grid grid-cols-6 gap-1.5">
                {quickAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => handleQuickAmount(amount)}
                    className="py-1.5 px-2 rounded-lg glass-card hover:bg-primary-gradient-r hover:text-white font-semibold text-xs transition-all"
                  >
                    ${amount}
                  </button>
                ))}
                <button
                  onClick={() => handleQuickAmount(suggestedAmount)}
                  className="py-1.5 px-2 rounded-lg bg-primary-gradient-r text-white font-semibold text-xs hover:opacity-90 transition-all"
                >
                  ${suggestedAmount}
                </button>
              </div>
            </div>

            {/* Calculator Buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              {/* Numbers 7-9 */}
              {['7', '8', '9'].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberClick(num)}
                  className="py-3 rounded-lg glass-card hover:bg-primary-lighter font-bold text-base transition-all active:scale-95"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={handleBackspace}
                className="py-3 rounded-lg glass-card hover:bg-red-100 dark:hover:bg-red-900/30 font-bold text-sm transition-all active:scale-95 text-red-600"
              >
                ⌫
              </button>

              {/* Numbers 4-6 */}
              {['4', '5', '6'].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberClick(num)}
                  className="py-3 rounded-lg glass-card hover:bg-primary-lighter font-bold text-base transition-all active:scale-95"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={handleClear}
                className="py-3 rounded-lg glass-card hover:bg-orange-100 dark:hover:bg-orange-900/30 font-bold text-sm transition-all active:scale-95 text-orange-600"
              >
                C
              </button>

              {/* Numbers 1-3 */}
              {['1', '2', '3'].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberClick(num)}
                  className="py-3 rounded-lg glass-card hover:bg-primary-lighter font-bold text-base transition-all active:scale-95"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => handleQuickAmount(total)}
                className="py-3 rounded-lg glass-card hover:bg-blue-100 dark:hover:bg-blue-900/30 font-bold text-xs transition-all active:scale-95 text-blue-600"
              >
                Exact
              </button>

              {/* Bottom row */}
              <button
                onClick={() => handleNumberClick('0')}
                className="col-span-2 py-3 rounded-lg glass-card hover:bg-primary-lighter font-bold text-base transition-all active:scale-95"
              >
                0
              </button>
              <button
                onClick={handleDecimalClick}
                className="py-3 rounded-lg glass-card hover:bg-primary-lighter font-bold text-base transition-all active:scale-95"
              >
                .
              </button>
              <button
                onClick={handleConfirm}
                disabled={amountPaid < total}
                className={`py-3 rounded-lg font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-1 ${
                  amountPaid >= total
                    ? 'bg-primary-gradient-r text-white hover:opacity-90'
                    : 'glass-card text-gray-400 cursor-not-allowed'
                }`}
              >
                {amountPaid >= total ? <ArrowRight className="w-4 h-4" /> : '✗'}
              </button>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button variant="ghost" onClick={onClose} className="w-full py-2 text-sm">
                Cancel
              </Button>
              <Button 
                onClick={handleConfirm}
                disabled={amountPaid < total}
                className="w-full py-2 text-sm"
              >
                {amountPaid >= total ? 'Confirm' : 'Insufficient'}
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
