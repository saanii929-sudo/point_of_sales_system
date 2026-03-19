'use client';

import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Printer, X as XIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

interface ReceiptPreviewProps {
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  discountCode?: string;
  total: number;
  paymentMethod: string;
  amountPaid?: number;
  change?: number;
  saleNumber?: string;
  onClose: () => void;
  onPrint: () => void;
}

interface BusinessBranding {
  businessName: string;
  logoUrl: string | null;
  companyTagline: string;
  phone: string;
  address: string;
  email: string;
}

export function ReceiptPreview({
  items,
  subtotal,
  tax,
  discount,
  discountCode,
  total,
  paymentMethod,
  amountPaid,
  change,
  saleNumber,
  onClose,
  onPrint
}: ReceiptPreviewProps) {
  const [branding, setBranding] = useState<BusinessBranding | null>(null);
  const receiptNumber = saleNumber ?? `RCP-${Date.now().toString(36).toUpperCase()}`;

  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    try {
      const res = await fetch('/api/business/branding');
      if (res.ok) {
        const data = await res.json();
        setBranding(data.branding);
      }
    } catch (error) {
      console.error('Failed to fetch branding');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Receipt - ${receiptNumber}</title>
        <style>
          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
            }
            .no-print {
              display: none !important;
            }
          }
          
          body {
            font-family: 'Courier New', monospace;
            width: 80mm;
            margin: 0 auto;
            padding: 10mm;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
            background: #fff;
          }
          
          .receipt-header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 2px dashed #000;
            padding-bottom: 15px;
          }
          
          .logo {
            max-width: 60mm;
            max-height: 30mm;
            margin: 0 auto 10px;
          }
          
          .business-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
            text-transform: uppercase;
          }
          
          .tagline {
            font-size: 10px;
            font-style: italic;
            margin-bottom: 8px;
          }
          
          .contact-info {
            font-size: 10px;
            line-height: 1.6;
          }
          
          .receipt-info {
            margin: 15px 0;
            font-size: 11px;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          
          .receipt-info div {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
          }
          
          .items-table {
            width: 100%;
            margin: 15px 0;
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          
          .item-row {
            margin-bottom: 8px;
          }
          
          .item-name {
            font-weight: bold;
            margin-bottom: 2px;
          }
          
          .item-details {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
          }
          
          .totals {
            margin: 15px 0;
          }
          
          .totals-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            font-size: 11px;
          }
          
          .totals-row.total {
            font-size: 14px;
            font-weight: bold;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            padding: 8px 0;
            margin-top: 10px;
          }
          
          .payment-info {
            margin: 15px 0;
            border-top: 1px dashed #000;
            border-bottom: 2px dashed #000;
            padding: 10px 0;
          }
          
          .payment-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            font-size: 11px;
          }
          
          .footer {
            text-align: center;
            margin-top: 15px;
            font-size: 11px;
          }
          
          .footer-message {
            margin: 8px 0;
            font-weight: bold;
          }
          
          .barcode {
            text-align: center;
            margin: 15px 0;
            font-size: 10px;
            letter-spacing: 2px;
          }
          
          .print-buttons {
            text-align: center;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 2px dashed #ccc;
          }
          
          .print-button {
            background: #10b981;
            color: white;
            border: none;
            padding: 12px 24px;
            margin: 0 5px;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
            font-weight: bold;
          }
          
          .print-button:hover {
            background: #059669;
          }
          
          .cancel-button {
            background: #6b7280;
            color: white;
            border: none;
            padding: 12px 24px;
            margin: 0 5px;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
            font-weight: bold;
          }
          
          .cancel-button:hover {
            background: #4b5563;
          }
        </style>
      </head>
      <body>
        <div class="receipt-header">
          ${branding?.logoUrl ? `<img src="${branding.logoUrl}" alt="Logo" class="logo" />` : ''}
          <div class="business-name">${branding?.businessName || 'Your Business'}</div>
          ${branding?.companyTagline ? `<div class="tagline">${branding.companyTagline}</div>` : ''}
          <div class="contact-info">
            ${branding?.address ? `<div>${branding.address}</div>` : ''}
            ${branding?.phone ? `<div>Tel: ${branding.phone}</div>` : ''}
            ${branding?.email ? `<div>Email: ${branding.email}</div>` : ''}
          </div>
        </div>
        
        <div class="receipt-info">
          <div>
            <span>Receipt #:</span>
            <span>${receiptNumber}</span>
          </div>
          <div>
            <span>Date:</span>
            <span>${format(new Date(), 'MMM dd, yyyy')}</span>
          </div>
          <div>
            <span>Time:</span>
            <span>${format(new Date(), 'hh:mm a')}</span>
          </div>
        </div>
        
        <div class="items-table">
          ${items.map(item => `
            <div class="item-row">
              <div class="item-name">${item.name}</div>
              <div class="item-details">
                <span>${item.quantity} x ${formatCurrency(item.price)}</span>
                <span>${formatCurrency(item.price * item.quantity)}</span>
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="totals">
          <div class="totals-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(subtotal)}</span>
          </div>
          <div class="totals-row">
            <span>Tax:</span>
            <span>${formatCurrency(tax)}</span>
          </div>
          ${discount > 0 ? `
            <div class="totals-row" style="color: #666;">
              <span>Discount${discountCode ? ` (${discountCode})` : ''}:</span>
              <span>-${formatCurrency(discount)}</span>
            </div>
          ` : ''}
          <div class="totals-row total">
            <span>TOTAL:</span>
            <span>${formatCurrency(total)}</span>
          </div>
        </div>
        
        <div class="payment-info">
          <div class="payment-row">
            <span>Payment Method:</span>
            <span>${paymentMethod.toUpperCase()}</span>
          </div>
          ${amountPaid ? `
            <div class="payment-row">
              <span>Amount Paid:</span>
              <span>${formatCurrency(amountPaid)}</span>
            </div>
          ` : ''}
          ${change && change > 0 ? `
            <div class="payment-row" style="font-weight: bold;">
              <span>Change:</span>
              <span>${formatCurrency(change)}</span>
            </div>
          ` : ''}
        </div>
        
        <div class="barcode">
          *${receiptNumber}*
        </div>
        
        <div class="footer">
          <div class="footer-message">THANK YOU FOR YOUR PURCHASE!</div>
          <div>Please come again</div>
          <div style="margin-top: 10px; font-size: 9px;">
            Powered by SaaS POS
          </div>
        </div>
        
        <div class="print-buttons no-print">
          <button class="print-button" onclick="window.print()">🖨️ Print</button>
          <button class="cancel-button" onclick="window.close()">Cancel</button>
        </div>
        
        <script>
          // Auto-print when page loads (optional)
          // window.onload = function() {
          //   setTimeout(function() {
          //     window.print();
          //   }, 500);
          // };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();

    // Close the preview modal — the popup handles the actual print
    onPrint();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Receipt Preview</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--text-tertiary)] hover:text-red-600 transition-colors">
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </CardHeader>
        <CardBody>
          {/* Receipt Preview - 80mm width simulation */}
          <div className="receipt-preview bg-white dark:bg-gray-900 p-6 font-mono text-sm border-2 border-gray-300 dark:border-gray-700 rounded-lg" style={{ width: '302px', margin: '0 auto' }}>
            {/* Header */}
            <div className="text-center mb-4 pb-4 border-b-2 border-dashed border-gray-400">
              {branding?.logoUrl && (
                <img 
                  src={branding.logoUrl} 
                  alt="Logo" 
                  className="max-w-[200px] max-h-[80px] mx-auto mb-3 object-contain"
                  onError={(e) => e.currentTarget.style.display = 'none'}
                />
              )}
              <h1 className="text-lg font-bold mb-1 uppercase">{branding?.businessName || 'Your Business'}</h1>
              {branding?.companyTagline && (
                <p className="text-xs italic mb-2">{branding.companyTagline}</p>
              )}
              <div className="text-xs space-y-0.5">
                {branding?.address && <p>{branding.address}</p>}
                {branding?.phone && <p>Tel: {branding.phone}</p>}
                {branding?.email && <p>Email: {branding.email}</p>}
              </div>
            </div>

            {/* Receipt Info */}
            <div className="text-xs mb-4 pb-3 border-b border-dashed border-gray-400 space-y-1">
              <div className="flex justify-between">
                <span>Receipt #:</span>
                <span className="font-bold">{receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{format(new Date(), 'MMM dd, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span>Time:</span>
                <span>{format(new Date(), 'hh:mm a')}</span>
              </div>
            </div>

            {/* Items */}
            <div className="mb-4 pb-3 border-b border-dashed border-gray-400">
              {items.map((item, index) => (
                <div key={index} className="mb-3">
                  <div className="font-bold text-xs mb-0.5">{item.name}</div>
                  <div className="flex justify-between text-xs">
                    <span>{item.quantity} x {formatCurrency(item.price)}</span>
                    <span className="font-bold">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1 text-xs mb-4">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount{discountCode ? ` (${discountCode})` : ''}:</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t-2 border-b-2 border-gray-800 py-2 mt-2">
                <span>TOTAL:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Payment */}
            <div className="text-xs mb-4 pb-3 border-b-2 border-dashed border-gray-400 space-y-1">
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="font-bold uppercase">{paymentMethod}</span>
              </div>
              {amountPaid && (
                <div className="flex justify-between">
                  <span>Amount Paid:</span>
                  <span>{formatCurrency(amountPaid)}</span>
                </div>
              )}
              {change && change > 0 && (
                <div className="flex justify-between font-bold">
                  <span>Change:</span>
                  <span>{formatCurrency(change)}</span>
                </div>
              )}
            </div>

            {/* Barcode */}
            <div className="text-center text-xs mb-4 tracking-wider">
              *{receiptNumber}*
            </div>

            {/* Footer */}
            <div className="text-center text-xs space-y-2">
              <p className="font-bold">THANK YOU FOR YOUR PURCHASE!</p>
              <p>Please come again</p>
              <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-3">
                Powered by SaaS POS
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button variant="ghost" onClick={onClose} className="flex-1">
              Close
            </Button>
            <Button onClick={handlePrint} className="flex-1 flex items-center gap-2 justify-center">
              <Printer className="w-4 h-4" />
              Print Receipt
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
