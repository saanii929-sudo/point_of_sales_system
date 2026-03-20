'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/useAuthStore';
import toast from 'react-hot-toast';
import { fetchWithOfflineFallback } from '@/lib/offlineDataCache';
import { CheckCircle2, CreditCard, Plus, ArrowLeft } from 'lucide-react';

interface SubscriptionPlan {
  _id: string;
  name: string;
  displayName: string;
  description: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  limits: {
    maxEmployees: number;
    maxBranches: number;
    maxProducts: number;
    hasAnalytics: boolean;
    hasReports: boolean;
    hasMultiBranch: boolean;
    hasAPI: boolean;
    supportLevel: string;
  };
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
}

export default function SubscriptionPlansPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState({
    displayName: '',
    description: '',
    price: 0,
    billingCycle: 'monthly' as 'monthly' | 'yearly',
    features: '',
    maxEmployees: 5,
    maxBranches: 1,
    maxProducts: 100,
    hasAnalytics: false,
    hasReports: false,
    hasMultiBranch: false,
    hasAPI: false,
    supportLevel: 'basic',
    sortOrder: 0
  });

  useEffect(() => {
    if (!user || user.role !== 'super_admin') {
      router.push('/dashboard');
      return;
    }
    fetchPlans();
  }, [user, router]);

  const fetchPlans = async () => {
    try {
      const { data } = await fetchWithOfflineFallback('/api/superadmin/plans');
      setPlans(data.plans);
    } catch (error) {
      toast.error('Failed to load plans');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const featuresArray = formData.features.split('\n').filter(f => f.trim());
      
      const payload = {
        name: formData.displayName.toLowerCase().replace(/\s+/g, '_'),
        displayName: formData.displayName,
        description: formData.description,
        price: formData.price,
        billingCycle: formData.billingCycle,
        features: featuresArray,
        limits: {
          maxEmployees: formData.maxEmployees,
          maxBranches: formData.maxBranches,
          maxProducts: formData.maxProducts,
          hasAnalytics: formData.hasAnalytics,
          hasReports: formData.hasReports,
          hasMultiBranch: formData.hasMultiBranch,
          hasAPI: formData.hasAPI,
          supportLevel: formData.supportLevel
        },
        sortOrder: formData.sortOrder
      };

      const url = '/api/superadmin/plans';
      const method = editingPlan ? 'PUT' : 'POST';
      const body = editingPlan ? { ...payload, planId: editingPlan._id } : payload;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        toast.success(editingPlan ? 'Plan updated' : 'Plan created');
        setShowModal(false);
        setEditingPlan(null);
        resetForm();
        fetchPlans();
      } else {
        toast.error('Failed to save plan');
      }
    } catch (error) {
      toast.error('Failed to save plan');
    }
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      displayName: plan.displayName,
      description: plan.description,
      price: plan.price,
      billingCycle: plan.billingCycle,
      features: plan.features.join('\n'),
      maxEmployees: plan.limits.maxEmployees,
      maxBranches: plan.limits.maxBranches,
      maxProducts: plan.limits.maxProducts,
      hasAnalytics: plan.limits.hasAnalytics,
      hasReports: plan.limits.hasReports,
      hasMultiBranch: plan.limits.hasMultiBranch,
      hasAPI: plan.limits.hasAPI,
      supportLevel: plan.limits.supportLevel,
      sortOrder: plan.sortOrder
    });
    setShowModal(true);
  };

  const handleDelete = async (planId: string) => {
    if (!confirm('Are you sure you want to deactivate this plan?')) return;

    try {
      const res = await fetch(`/api/superadmin/plans?id=${planId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        toast.success('Plan deactivated');
        fetchPlans();
      } else {
        toast.error('Failed to deactivate plan');
      }
    } catch (error) {
      toast.error('Failed to deactivate plan');
    }
  };

  const resetForm = () => {
    setFormData({
      displayName: '',
      description: '',
      price: 0,
      billingCycle: 'monthly',
      features: '',
      maxEmployees: 5,
      maxBranches: 1,
      maxProducts: 100,
      hasAnalytics: false,
      hasReports: false,
      hasMultiBranch: false,
      hasAPI: false,
      supportLevel: 'basic',
      sortOrder: 0
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-white via-white to-white dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2 flex items-center gap-2">
              <CreditCard className="w-10 h-10" />
              Subscription Plans
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Manage platform subscription plans</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => router.push('/superadmin')}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Button onClick={() => { resetForm(); setShowModal(true); }}>
              <Plus className="w-4 h-4 mr-1" />
              Create Plan
            </Button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan._id} glass hover className={!plan.isActive ? 'opacity-50' : ''}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-bold">{plan.displayName}</h3>
                    {plan.isDefault && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-green-600">GH₵{plan.price}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">/{plan.billingCycle}</p>
                  </div>
                </div>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{plan.description}</p>

                <div className="space-y-2 mb-4">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Features:</p>
                  <ul className="text-sm space-y-1">
                    {plan.features.slice(0, 5).map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                    {plan.features.length > 5 && (
                      <li className="text-xs text-gray-500">+{plan.features.length - 5} more</li>
                    )}
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded">
                    <p className="text-gray-600 dark:text-gray-400">Employees</p>
                    <p className="font-bold">{plan.limits.maxEmployees}</p>
                  </div>
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded">
                    <p className="text-gray-600 dark:text-gray-400">Branches</p>
                    <p className="font-bold">{plan.limits.maxBranches}</p>
                  </div>
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded">
                    <p className="text-gray-600 dark:text-gray-400">Products</p>
                    <p className="font-bold">{plan.limits.maxProducts}</p>
                  </div>
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded">
                    <p className="text-gray-600 dark:text-gray-400">Support</p>
                    <p className="font-bold capitalize">{plan.limits.supportLevel}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleEdit(plan)} className="flex-1">
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleDelete(plan._id)}
                    className="flex-1"
                  >
                    {plan.isActive ? 'Deactivate' : 'Deactivated'}
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <h2 className="text-2xl font-bold">
                  {editingPlan ? 'Edit Plan' : 'Create New Plan'}
                </h2>
              </CardHeader>
              <CardBody>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Plan Name</label>
                      <Input
                        value={formData.displayName}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Price</label>
                      <Input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                      rows={3}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Billing Cycle</label>
                      <select
                        value={formData.billingCycle}
                        onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value as any })}
                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Sort Order</label>
                      <Input
                        type="number"
                        value={formData.sortOrder}
                        onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Features (one per line)</label>
                    <textarea
                      value={formData.features}
                      onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                      rows={5}
                      placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Max Employees</label>
                      <Input
                        type="number"
                        value={formData.maxEmployees}
                        onChange={(e) => setFormData({ ...formData, maxEmployees: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Max Branches</label>
                      <Input
                        type="number"
                        value={formData.maxBranches}
                        onChange={(e) => setFormData({ ...formData, maxBranches: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Max Products</label>
                      <Input
                        type="number"
                        value={formData.maxProducts}
                        onChange={(e) => setFormData({ ...formData, maxProducts: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.hasAnalytics}
                        onChange={(e) => setFormData({ ...formData, hasAnalytics: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Has Analytics</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.hasReports}
                        onChange={(e) => setFormData({ ...formData, hasReports: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Has Reports</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.hasMultiBranch}
                        onChange={(e) => setFormData({ ...formData, hasMultiBranch: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Multi-Branch</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.hasAPI}
                        onChange={(e) => setFormData({ ...formData, hasAPI: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">API Access</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Support Level</label>
                    <select
                      value={formData.supportLevel}
                      onChange={(e) => setFormData({ ...formData, supportLevel: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    >
                      <option value="basic">Basic</option>
                      <option value="priority">Priority</option>
                      <option value="dedicated">Dedicated</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                      {editingPlan ? 'Update Plan' : 'Create Plan'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={() => { setShowModal(false); setEditingPlan(null); resetForm(); }}
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
    </div>
  );
}
