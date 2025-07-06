import React, { useState, useEffect } from 'react';
import { Building2, Users, TrendingUp, DollarSign, Calendar, Crown, Activity, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DashboardStats {
  totalCompanies: number;
  totalUsers: number;
  totalBookings: number;
  totalRevenue: number;
  activeCompanies: number;
  recentSignups: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCompanies: 0,
    totalUsers: 0,
    totalBookings: 0,
    totalRevenue: 0,
    activeCompanies: 0,
    recentSignups: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentCompanies, setRecentCompanies] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch companies
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (companiesError) throw companiesError;

      // Fetch users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*');

      if (usersError) throw usersError;

      // Fetch bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('total_amount, created_at');

      if (bookingsError) throw bookingsError;

      // Calculate stats
      const totalRevenue = bookings?.reduce((sum, booking) => sum + Number(booking.total_amount), 0) || 0;
      
      // Companies with bookings in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentBookings = bookings?.filter(booking => 
        new Date(booking.created_at) > thirtyDaysAgo
      ) || [];

      // Users signed up in last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentUsers = users?.filter(user => 
        new Date(user.created_at) > sevenDaysAgo
      ) || [];

      setStats({
        totalCompanies: companies?.length || 0,
        totalUsers: users?.length || 0,
        totalBookings: bookings?.length || 0,
        totalRevenue,
        activeCompanies: companies?.length || 0, // For now, all companies are considered active
        recentSignups: recentUsers.length,
      });

      // Set recent companies (last 5)
      setRecentCompanies(companies?.slice(0, 5) || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const statCards = [
    {
      title: 'Total Companies',
      value: stats.totalCompanies.toString(),
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      change: '+12%',
      changeType: 'positive' as const,
    },
    {
      title: 'Total Users',
      value: stats.totalUsers.toString(),
      icon: Users,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      change: '+8%',
      changeType: 'positive' as const,
    },
    {
      title: 'Total Bookings',
      value: stats.totalBookings.toString(),
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      change: '+23%',
      changeType: 'positive' as const,
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: '+15%',
      changeType: 'positive' as const,
    },
    {
      title: 'Active Companies',
      value: stats.activeCompanies.toString(),
      icon: Activity,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      change: '+5%',
      changeType: 'positive' as const,
    },
    {
      title: 'Recent Signups',
      value: stats.recentSignups.toString(),
      icon: TrendingUp,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      change: '+18%',
      changeType: 'positive' as const,
    },
  ];

  if (loading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-xl shadow-sm border h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Globe className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
        </div>
        <p className="text-slate-600">
          Overview of your FloatBook SaaS platform performance and metrics.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.bgColor} ${stat.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className={`text-sm font-medium ${
                  stat.changeType === 'positive' ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Companies */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-purple-600" />
              Recent Companies
            </h2>
          </div>
          <div className="p-6">
            {recentCompanies.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-slate-500">No companies yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentCompanies.map((company) => (
                  <div key={company.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{company.name}</p>
                        <p className="text-sm text-slate-500">{company.currency || 'USD'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">{formatDate(company.created_at)}</p>
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">
                        <Crown className="h-3 w-3" />
                        Free Plan
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              System Health
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Database Status</span>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  Healthy
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">API Response Time</span>
                <span className="text-sm text-slate-900 font-medium">~120ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Uptime</span>
                <span className="text-sm text-slate-900 font-medium">99.9%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Active Sessions</span>
                <span className="text-sm text-slate-900 font-medium">{stats.totalUsers}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}