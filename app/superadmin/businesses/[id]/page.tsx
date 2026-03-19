'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/useAuthStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface BusinessDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  subscriptionExpiry: string;
  isActive: boolean;
  createdAt: string;
  limits: {
    maxEmployees: number;
    maxBranches: number;
    hasAnalytics: boolean;
  };
  stats: {
    users: number;
    products: number;
    sales: number;
    revenue: number;
    profit: number;
  };
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
}

export default function BusinessDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    subscriptionPlan: '',
    subscriptionStatus: '',
    subscriptionExpiry: ''
  });

  useEffect(() => {
    if (!user || user.role !== 'super_admin') {
      router.push('/dashboard');
      return;
    }
    fetchBusinessDetail();
  }, [user, router, params.id]);

  const fetchBusinessDetail = async () => {
    try {
      const res = await fetch(`/api/superadmin/businesses/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setBusiness(data.business);
        setEditForm({
          subscriptionPlan: data.business.subscriptionPlan,
          subscriptionStatus: data.business.subscriptionStatus,
          subscriptionExpiry: format(new Date(data.business.subscriptionExpiry), 'yyyy-MM-dd')
        });
      } else {
        toast.error('Failed to load business details');
        router.push('/superadmin/businesses');
      }
    } catch (error) {
      toast.error('Failed to load business details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSubscription = async () => {
    try {
      const res = await fetch('/api/superadmin/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-subscription',
          businessId: params.id,
          data: editForm
        })
      });

      if (res.ok) {
        toast.success('Subscription updated successfully');
        setIsEditing(false);
        fetchBusinessDetail();
      } else {
        toast.error('Failed to update subscription');
      }
    } catch (error) {
      toast.error('Failed to update subscription');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!business) return null;

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-gray-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">{business.name}</h1>
            <p className="text-gray-600 dark:text-gray-400">Business Details & Management</p>
          </div>
          <Button onClick={() => router.push('/superadmin/businesses')}>
            ← Back to Businesses
          </Button>
        </div>

        {/* Business Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card glass className="lg:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Business Information</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  business.isActive 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {business.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Email</p>
                  <p className="font-semibold">{business.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Phone</p>
                  <p className="font-semibold">{business.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Address</p>
                  <p className="font-semibold">{business.address || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Registered</p>
                  <p className="font-semibold">{format(new Date(business.createdAt), 'MMM dd, yyyy')}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card glass>
            <CardHeader>
              <h2 className="text-xl font-bold">Plan Limits</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Max Employees</p>
                  <p className="text-2xl font-bold text-green-600">{business.limits.maxEmployees}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Max Branches</p>
                  <p className="text-2xl font-bold text-blue-600">{business.limits.maxBranches}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Analytics Access</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {business.limits.hasAnalytics ? '✓' : '✗'}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Subscription Management */}
        <Card glass>
          <CardHeader>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Subscription Management</h2>
              {!isEditing && (
                <Button size="sm" onClick={() => setIsEditing(true)}>
                  Edit Subscription
                </Button>
              )}
            </div>
          </CardHeader>
          <CardBody>
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Plan</label>
                    <select
                      value={editForm.subscriptionPlan}
                      onChange={(e) => setEditForm({ ...editForm, subscriptionPlan: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    >
                      <option value="starter">Starter</option>
                      <option value="professional">Professional</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Status</label>
                    <select
                      value={editForm.subscriptionStatus}
                      onChange={(e) => setEditForm({ ...editForm, subscriptionStatus: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    >
                      <option value="active">Active</option>
                      <option value="trial">Trial</option>
                      <option value="expired">Expired</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Expiry Date</label>
                    <Input
                      type="date"
                      value={editForm.subscriptionExpiry}
                      onChange={(e) => setEditForm({ ...editForm, subscriptionExpiry: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleUpdateSubscription}>Save Changes</Button>
                  <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Plan</p>
                  <span className="px-4 py-2 bg-primary-gradient-r text-white rounded-full text-sm font-semibold inline-block">
                    {business.subscriptionPlan}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Status</p>
                  <p className="font-semibold capitalize">{business.subscriptionStatus}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Expires On</p>
                  <p className="font-semibold">{format(new Date(business.subscriptionExpiry), 'MMM dd, yyyy')}</p>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card glass hover>
            <CardBody>
              <div className="text-center">
                <div className="text-4xl mb-2">👥</div>
                <p className="text-3xl font-bold text-green-600">{business.stats.users}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Users</p>
              </div>
            </CardBody>
          </Card>

          <Card glass hover>
            <CardBody>
              <div className="text-center">
                <div className="text-4xl mb-2">📦</div>
                <p className="text-3xl font-bold text-blue-600">{business.stats.products}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Products</p>
              </div>
            </CardBody>
          </Card>

          <Card glass hover>
            <CardBody>
              <div className="text-center">
                <div className="text-4xl mb-2">🛒</div>
                <p className="text-3xl font-bold text-purple-600">{business.stats.sales}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Sales</p>
              </div>
            </CardBody>
          </Card>

          <Card glass hover>
            <CardBody>
              <div className="text-center">
                <div className="text-4xl mb-2">💰</div>
                <p className="text-3xl font-bold text-emerald-600">GH₵{business.stats.revenue.toFixed(0)}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Revenue</p>
              </div>
            </CardBody>
          </Card>

          <Card glass hover>
            <CardBody>
              <div className="text-center">
                <div className="text-4xl mb-2">📈</div>
                <p className="text-3xl font-bold text-green-600">GH₵{business.stats.profit.toFixed(0)}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Profit</p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
