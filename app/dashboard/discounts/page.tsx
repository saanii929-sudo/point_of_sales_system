'use client';

import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { 
  Tag, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar, 
  Percent, 
  DollarSign,
  Package,
  Layers,
  Users,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';

interface Discount {
  _id: string;
  code: string;
  name: string;
  description: string;
  type: 'percentage' | 'fixed';
  value: number;
  minPurchaseAmount: number;
  maxDiscountAmount: number | null;
  applicableTo: 'all' | 'specific_products' | 'specific_categories';
  products: any[];
  categories: any[];
  usageLimit: number | null;
  usageCount: number;
  usagePerCustomer: number | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdBy: any;
}

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [filterStatus, setFilterStatus] = useState('active');
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: 0,
    minPurchaseAmount: 0,
    maxDiscountAmount: null as number | null,
    applicableTo: 'all' as 'all' | 'specific_products' | 'specific_categories',
    usageLimit: null as number | null,
    usagePerCustomer: null as number | null,
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchDiscounts();
  }, [filterStatus]);

  const fetchDiscounts = async () => {
    try {
      const res = await fetch(`/api/discounts?status=${filterStatus}`);
      if (res.ok) {
        const data = await res.json();
        setDiscounts(data.discounts);
      }
    } catch (error) {
      toast.error('Failed to load discounts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingDiscount ? `/api/discounts/${editingDiscount._id}` : '/api/discounts';
      const method = editingDiscount ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success(editingDiscount ? 'Discount updated' : 'Discount created');
        setShowModal(false);
        resetForm();
        fetchDiscounts();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save discount');
      }
    } catch (error) {
      toast.error('Failed to save discount');
    }
  };

  const handleEdit = (discount: Discount) => {
    setEditingDiscount(discount);
    setFormData({
      code: discount.code,
      name: discount.name,
      description: discount.description,
      type: discount.type,
      value: discount.value,
      minPurchaseAmount: discount.minPurchaseAmount,
      maxDiscountAmount: discount.maxDiscountAmount,
      applicableTo: discount.applicableTo,
      usageLimit: discount.usageLimit,
      usagePerCustomer: discount.usagePerCustomer,
      startDate: format(new Date(discount.startDate), 'yyyy-MM-dd'),
      endDate: format(new Date(discount.endDate), 'yyyy-MM-dd')
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this discount?')) return;

    try {
      const res = await fetch(`/api/discounts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Discount deleted');
        fetchDiscounts();
      } else {
        toast.error('Failed to delete discount');
      }
    } catch (error) {
      toast.error('Failed to delete discount');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      type: 'percentage',
      value: 0,
      minPurchaseAmount: 0,
      maxDiscountAmount: null,
      applicableTo: 'all',
      usageLimit: null,
      usagePerCustomer: null,
      startDate: '',
      endDate: ''
    });
    setEditingDiscount(null);
  };

  const isDiscountActive = (discount: Discount) => {
    const now = new Date();
    const start = new Date(discount.startDate);
    const end = new Date(discount.endDate);
    return discount.isActive && now >= start && now <= end;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text flex items-center gap-2">
            <Tag className="w-8 h-8" />
            Discount Codes
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create and manage promotional discount codes
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Create Discount
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['active', 'expired', 'all'].map((status) => (
          <Button
            key={status}
            variant={filterStatus === status ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFilterStatus(status)}
            className="capitalize"
          >
            {status}
          </Button>
        ))}
      </div>

      {/* Discounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {discounts.map((discount) => (
          <Card key={discount._id} glass hover>
            <CardBody>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 bg-primary-gradient-r text-white rounded-lg font-mono font-bold text-sm">
                      {discount.code}
                    </span>
                    {isDiscountActive(discount) ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <h3 className="font-bold text-lg">{discount.name}</h3>
                  {discount.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {discount.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Discount Value */}
              <div className="mb-4 p-3 bg-primary-lighter rounded-xl">
                <div className="flex items-center gap-2 text-primary">
                  {discount.type === 'percentage' ? (
                    <>
                      <Percent className="w-5 h-5" />
                      <span className="text-2xl font-bold">{discount.value}% OFF</span>
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-5 h-5" />
                      <span className="text-2xl font-bold">GH₵{discount.value} OFF</span>
                    </>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm mb-4">
                {discount.minPurchaseAmount > 0 && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <DollarSign className="w-4 h-4" />
                    <span>Min purchase: GH₵{discount.minPurchaseAmount}</span>
                  </div>
                )}
                
                {discount.maxDiscountAmount && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <DollarSign className="w-4 h-4" />
                    <span>Max discount: GH₵{discount.maxDiscountAmount}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  {discount.applicableTo === 'all' ? (
                    <>
                      <Layers className="w-4 h-4" />
                      <span>Applies to all products</span>
                    </>
                  ) : discount.applicableTo === 'specific_products' ? (
                    <>
                      <Package className="w-4 h-4" />
                      <span>Specific products only</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-4 h-4" />
                      <span>Specific categories only</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {format(new Date(discount.startDate), 'MMM dd')} - {format(new Date(discount.endDate), 'MMM dd, yyyy')}
                  </span>
                </div>

                {discount.usageLimit && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Users className="w-4 h-4" />
                    <span>Used {discount.usageCount} / {discount.usageLimit} times</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleEdit(discount)} className="flex-1">
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(discount._id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {discounts.length === 0 && (
        <Card glass>
          <CardBody>
            <div className="text-center py-12">
              <Tag className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400">
                No discounts found. Create your first discount code!
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Tag className="w-6 h-6" />
                {editingDiscount ? 'Edit Discount' : 'Create Discount'}
              </h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Discount Code *</label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="SUMMER2024"
                      required
                      className="uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Discount Name *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Summer Sale"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Special summer discount for all customers"
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Discount Type *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (GH₵)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Value * {formData.type === 'percentage' ? '(%)' : '(GH₵)'}
                    </label>
                    <Input
                      type="number"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                      min="0"
                      max={formData.type === 'percentage' ? '100' : undefined}
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Min Purchase Amount (GH₵)</label>
                    <Input
                      type="number"
                      value={formData.minPurchaseAmount}
                      onChange={(e) => setFormData({ ...formData, minPurchaseAmount: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Max Discount Amount (GH₵)</label>
                    <Input
                      type="number"
                      value={formData.maxDiscountAmount || ''}
                      onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value ? parseFloat(e.target.value) : null })}
                      min="0"
                      step="0.01"
                      placeholder="Unlimited"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Applicable To</label>
                  <select
                    value={formData.applicableTo}
                    onChange={(e) => setFormData({ ...formData, applicableTo: e.target.value as any })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  >
                    <option value="all">All Products</option>
                    <option value="specific_products">Specific Products</option>
                    <option value="specific_categories">Specific Categories</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Usage Limit</label>
                    <Input
                      type="number"
                      value={formData.usageLimit || ''}
                      onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value ? parseInt(e.target.value) : null })}
                      min="1"
                      placeholder="Unlimited"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Usage Per Customer</label>
                    <Input
                      type="number"
                      value={formData.usagePerCustomer || ''}
                      onChange={(e) => setFormData({ ...formData, usagePerCustomer: e.target.value ? parseInt(e.target.value) : null })}
                      min="1"
                      placeholder="Unlimited"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Start Date *</label>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">End Date *</label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    {editingDiscount ? 'Update Discount' : 'Create Discount'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => { setShowModal(false); resetForm(); }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
