'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/useAuthStore';
import toast from 'react-hot-toast';
import { fetchWithOfflineFallback } from '@/lib/offlineDataCache';
import { format } from 'date-fns';
import {
  Building2,
  CheckCircle2,
  Users,
  DollarSign,
  Package,
  ShoppingCart,
  Award,
  Medal,
  Trophy,
  TrendingUp
} from 'lucide-react';

interface SuperAdminStats {
  overview: {
    totalBusinesses: number;
    activeBusinesses: number;
    inactiveBusinesses: number;
    totalUsers: number;
    totalProducts: number;
    totalSales: number;
    totalRevenue: number;
    totalProfit: number;
    newBusinessesThisMonth: number;
  };
  subscriptionBreakdown: Record<string, number>;
  recentBusinesses: Array<{
    id: string;
    name: string;
    email: string;
    subscriptionPlan: string;
    createdAt: string;
  }>;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'super_admin') {
      router.push('/dashboard');
      return;
    }
    fetchStats();
  }, [user, router]);

  const fetchStats = async () => {
    try {
      const { data } = await fetchWithOfflineFallback('/api/superadmin/stats');
      setStats(data);
    } catch (error) {
      toast.error('Failed to load stats');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-white via-white to-white dark:from-gray-900 dark:via-purple-900/20 dark:to-pink-900/20">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">Super Admin Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">Platform Overview & Management</p>
          </div>
          <Button onClick={() => router.push('/superadmin/businesses')}>
            Manage Businesses →
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card glass hover>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Businesses</p>
                  <p className="text-3xl font-bold mt-1">{stats.overview.totalBusinesses}</p>
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    +{stats.overview.newBusinessesThisMonth} this month
                  </p>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card glass hover>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Businesses</p>
                  <p className="text-3xl font-bold mt-1 text-green-600">{stats.overview.activeBusinesses}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {stats.overview.inactiveBusinesses} inactive
                  </p>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card glass hover>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
                  <p className="text-3xl font-bold mt-1">{stats.overview.totalUsers}</p>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center">
                  <Users className="w-8 h-8 text-white" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card glass hover>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
                  <p className="text-3xl font-bold mt-1 text-green-600">
                    ${stats.overview.totalRevenue.toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    ${stats.overview.totalProfit.toFixed(0)} profit
                  </p>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-600 rounded-2xl flex items-center justify-center">
                  <DollarSign className="w-8 h-8 text-white" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card glass hover>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Products</p>
                  <p className="text-3xl font-bold mt-1">{stats.overview.totalProducts}</p>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-600 rounded-2xl flex items-center justify-center">
                  <Package className="w-8 h-8 text-white" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card glass hover>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Sales</p>
                  <p className="text-3xl font-bold mt-1">{stats.overview.totalSales}</p>
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center">
                  <ShoppingCart className="w-8 h-8 text-white" />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Subscription Breakdown */}
        <Card glass>
          <CardHeader>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Award className="w-6 h-6" />
              Subscription Plans
            </h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Medal className="w-8 h-8 text-white" />
                </div>
                <p className="text-2xl font-bold">{stats.subscriptionBreakdown.starter || 0}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Starter</p>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-2xl">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <p className="text-2xl font-bold">{stats.subscriptionBreakdown.professional || 0}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Professional</p>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-2xl">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <p className="text-2xl font-bold">{stats.subscriptionBreakdown.enterprise || 0}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Enterprise</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Recent Businesses */}
        <Card glass>
          <CardHeader>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Recent Businesses</h2>
              <Button variant="ghost" onClick={() => router.push('/superadmin/businesses')}>
                View All →
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {stats.recentBusinesses.map((business) => (
                <div
                  key={business.id}
                  className="flex items-center justify-between p-4 glass-card rounded-xl hover:scale-[1.02] transition-transform cursor-pointer"
                  onClick={() => router.push(`/superadmin/businesses/${business.id}`)}
                >
                  <div>
                    <p className="font-semibold">{business.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{business.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-primary-gradient-r text-white rounded-full text-xs font-semibold">
                      {business.subscriptionPlan}
                    </span>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {format(new Date(business.createdAt), 'MMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

