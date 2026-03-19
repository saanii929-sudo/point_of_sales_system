'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/useAuthStore';
import toast from 'react-hot-toast';

export default function CreateBusinessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    businessName: searchParams.get('businessName') || '',
    ownerName: searchParams.get('name') || '',
    ownerEmail: searchParams.get('email') || '',
    ownerPassword: '',
    phone: '',
    address: '',
    subscriptionPlanId: '',
    subscriptionExpiry: ''
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
      const res = await fetch('/api/superadmin/plans');
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans.filter((p: any) => p.isActive));
        
        // Set default plan if available
        const defaultPlan = data.plans.find((p: any) => p.isDefault && p.isActive);
        if (defaultPlan) {
          setFormData(prev => ({ ...prev, subscriptionPlanId: defaultPlan._id }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch plans');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/superadmin/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          ...formData
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Business created successfully!');
        router.push('/superadmin/businesses');
      } else {
        toast.error(data.error || 'Failed to create business');
      }
    } catch (error) {
      toast.error('Failed to create business');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-gray-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">Create New Business</h1>
            <p className="text-gray-600 dark:text-gray-400">Add a new business to the platform</p>
          </div>
          <Button onClick={() => router.push('/superadmin/businesses')}>
            ← Back
          </Button>
        </div>

        {/* Form */}
        <Card glass>
          <CardHeader>
            <h2 className="text-2xl font-bold">Business Information</h2>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Business Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Business Details</h3>
                
                <div>
                  <label className="block text-sm font-semibold mb-2">Business Name *</label>
                  <Input
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="Acme Store"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Phone</label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Address</label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="123 Main St, City"
                    />
                  </div>
                </div>
              </div>

              {/* Owner Details */}
              <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Business Owner</h3>
                
                <div>
                  <label className="block text-sm font-semibold mb-2">Owner Name *</label>
                  <Input
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Owner Email *</label>
                    <Input
                      type="email"
                      value={formData.ownerEmail}
                      onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                      placeholder="owner@example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Owner Password *</label>
                    <Input
                      type="password"
                      value={formData.ownerPassword}
                      onChange={(e) => setFormData({ ...formData, ownerPassword: e.target.value })}
                      placeholder="Min. 8 characters"
                      required
                      minLength={8}
                    />
                  </div>
                </div>
              </div>

              {/* Subscription Details */}
              <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Subscription</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Subscription Plan *</label>
                    <select
                      value={formData.subscriptionPlanId}
                      onChange={(e) => setFormData({ ...formData, subscriptionPlanId: e.target.value })}
                      className="w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
                      required
                    >
                      <option value="">Select a plan</option>
                      {plans.map((plan) => (
                        <option key={plan._id} value={plan._id}>
                          {plan.displayName} - GH₵{plan.price}/{plan.billingCycle}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Subscription Expiry *</label>
                    <Input
                      type="date"
                      value={formData.subscriptionExpiry}
                      onChange={(e) => setFormData({ ...formData, subscriptionExpiry: e.target.value })}
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                {formData.subscriptionPlanId && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Selected Plan:</strong> {plans.find(p => p._id === formData.subscriptionPlanId)?.displayName}
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      {plans.find(p => p._id === formData.subscriptionPlanId)?.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex gap-4 pt-6">
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'Creating...' : 'Create Business'}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => router.push('/superadmin/businesses')}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
