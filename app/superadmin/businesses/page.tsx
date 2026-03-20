'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/useAuthStore';
import toast from 'react-hot-toast';
import { fetchWithOfflineFallback, getCachedData } from '@/lib/offlineDataCache';
import { format } from 'date-fns';

interface Business {
  id: string;
  name: string;
  email: string;
  phone: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  subscriptionExpiry: string;
  isActive: boolean;
  createdAt: string;
  stats: {
    users: number;
    products: number;
    sales: number;
    revenue: number;
  };
}

export default function BusinessesManagement() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'super_admin') {
      router.push('/dashboard');
      return;
    }
    fetchBusinesses();
  }, [user, router]);

  const fetchBusinesses = async (searchQuery = '') => {
    try {
      const url = searchQuery
        ? `/api/superadmin/businesses?search=${encodeURIComponent(searchQuery)}`
        : '/api/superadmin/businesses';

      try {
        const { data } = await fetchWithOfflineFallback(url);
        setBusinesses(data.businesses);
      } catch {
        // Offline and specific URL not cached — fall back to base cache and filter client-side
        const cached = await getCachedData('/api/superadmin/businesses');
        if (cached) {
          const filtered = searchQuery
            ? cached.businesses.filter((b: Business) =>
                b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.email.toLowerCase().includes(searchQuery.toLowerCase()))
            : cached.businesses;
          setBusinesses(filtered);
        } else {
          toast.error('No data available offline');
        }
      }
    } catch (error) {
      toast.error('Failed to load businesses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBusinesses(search);
  };

  const toggleBusinessStatus = async (businessId: string) => {
    try {
      const res = await fetch('/api/superadmin/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle-status', businessId })
      });

      if (res.ok) {
        toast.success('Business status updated');
        fetchBusinesses(search);
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
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
            <h1 className="text-4xl font-bold gradient-text mb-2">Business Management</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage all businesses on the platform</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => router.push('/superadmin/businesses/create')}>
              + Create Business
            </Button>
            <Button variant="ghost" onClick={() => router.push('/superadmin')}>
              ← Back
            </Button>
          </div>
        </div>

        {/* Search */}
        <Card glass>
          <CardBody>
            <form onSubmit={handleSearch} className="flex gap-4">
              <Input
                type="text"
                placeholder="Search by business name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1"
              />
              <Button type="submit">Search</Button>
              {search && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => {
                    setSearch('');
                    fetchBusinesses('');
                  }}
                >
                  Clear
                </Button>
              )}
            </form>
          </CardBody>
        </Card>

        {/* Businesses List */}
        <div className="grid gap-6">
          {businesses.length === 0 ? (
            <Card glass>
              <CardBody>
                <p className="text-center text-gray-600 dark:text-gray-400 py-8">
                  No businesses found
                </p>
              </CardBody>
            </Card>
          ) : (
            businesses.map((business) => (
              <Card key={business.id} glass hover>
                <CardBody>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold">{business.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          business.isActive 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {business.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className="px-3 py-1 bg-primary-gradient-r text-white rounded-full text-xs font-semibold">
                          {business.subscriptionPlan}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Email</p>
                          <p className="text-sm font-semibold">{business.email}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Phone</p>
                          <p className="text-sm font-semibold">{business.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Subscription Status</p>
                          <p className="text-sm font-semibold capitalize">{business.subscriptionStatus}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Expiry Date</p>
                          <p className="text-sm font-semibold">
                            {format(new Date(business.subscriptionExpiry), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">{business.stats.users}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Users</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{business.stats.products}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Products</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-600">{business.stats.sales}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Sales</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-emerald-600">GH₵{business.stats.revenue.toFixed(0)}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Revenue</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        size="sm"
                        onClick={() => router.push(`/superadmin/businesses/${business.id}`)}
                      >
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleBusinessStatus(business.id)}
                      >
                        {business.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Registered on {format(new Date(business.createdAt), 'MMMM dd, yyyy')}
                    </p>
                  </div>
                </CardBody>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

