import React, { useState, useEffect } from 'react';
import { Calendar, Users, TrendingUp, Clock, Plus, CheckCircle, CircleDollarSign, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useCompany } from '../hooks/useCompany';
import { Booking, Room } from '../types';
import { formatCurrency } from '../utils/currency';

export function Dashboard() {
  const { companyId } = useAuth();
  const { company } = useCompany(companyId);
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    todayBookings: 0,
    occupancyRate: 0,
  });
  const [todayBookings, setTodayBookings] = useState<(Booking & { room: Room })[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<(Booking & { room: Room })[]>([]);
  const [chartData, setChartData] = useState<{ date: string; bookings: number; revenue: number }[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming'>('today');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyId) {
      fetchDashboardData();
    }
  }, [companyId]);

  const fetchDashboardData = async () => {
    if (!companyId) return;

    try {
      setLoading(true);

      // Get today's date
      const today = new Date().toISOString().split('T')[0];

      // Fetch bookings with room data
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          room:rooms(*)
        `)
        .eq('company_id', companyId);

      if (bookingsError) throw bookingsError;

      // Fetch rooms for calculating occupancy
      const { data: rooms, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .eq('company_id', companyId);

      if (roomsError) throw roomsError;

      // Calculate stats
      const totalRevenue = bookings?.reduce((sum, booking) => sum + Number(booking.total_amount), 0) || 0;
      const totalBookings = bookings?.length || 0;
      const todayBookingsData = bookings?.filter(booking => booking.check_in_date === today) || [];
      const todayBookingsCount = todayBookingsData.length;
      
      // Calculate occupancy rate (today's bookings / total rooms)
      const occupancyRate = rooms?.length ? (todayBookingsCount / rooms.length) * 100 : 0;

      // Get upcoming bookings (next 7 days)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];

      const upcomingBookingsData = bookings?.filter(booking => 
        booking.check_in_date > today && booking.check_in_date <= nextWeekStr
      ).sort((a, b) => new Date(a.check_in_date).getTime() - new Date(b.check_in_date).getTime()) || [];

      // Generate chart data for last 7 days
      const chartData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayBookings = bookings?.filter(booking => booking.check_in_date === dateStr) || [];
        const dayRevenue = dayBookings.reduce((sum, booking) => sum + Number(booking.total_amount), 0);
        
        chartData.push({
          date: dateStr,
          bookings: dayBookings.length,
          revenue: dayRevenue,
        });
      }

      setStats({
        totalRevenue,
        totalBookings,
        todayBookings: todayBookingsCount,
        occupancyRate,
      });

      setTodayBookings(todayBookingsData);
      setUpcomingBookings(upcomingBookingsData.slice(0, 5)); // Show next 5
      setChartData(chartData);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePaymentStatus = async (booking: Booking) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ is_paid: !booking.is_paid })
        .eq('id', booking.id);

      if (error) throw error;
      fetchDashboardData();
    } catch (error) {
      console.error('Error updating payment status:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateRange = (checkIn: string, checkOut: string) => {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    if (checkInDate.toDateString() === checkOutDate.toDateString()) {
      return formatDate(checkIn);
    }
    
    return `${formatDate(checkIn)} - ${formatDate(checkOut)}`;
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-xl shadow-sm border h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue, company?.currency),
      icon: CircleDollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Total Bookings',
      value: stats.totalBookings.toString(),
      icon: Calendar,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: "Today's Bookings",
      value: stats.todayBookings.toString(),
      icon: Clock,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Occupancy Rate',
      value: `${stats.occupancyRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
  ];

  const maxBookings = Math.max(...chartData.map(d => d.bookings), 1);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome back{company ? `, ${company.name}` : ''}
          </h1>
          <p className="text-slate-600">
            Here's what's happening with your bookings today.
          </p>
        </div>
        <button
          onClick={() => navigate('/bookings')}
          className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-3 rounded-lg font-medium hover:from-emerald-700 hover:to-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 self-start"
        >
          <Plus className="h-5 w-5" />
          New Booking
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs lg:text-sm font-medium text-slate-600 mb-1">{stat.title}</p>
                  <p className="text-lg lg:text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} ${stat.color} p-2 lg:p-3 rounded-lg`}>
                  <Icon className="h-4 w-4 lg:h-6 lg:w-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            Booking Trends (Last 7 Days)
          </h2>
        </div>
        
        <div className="h-48 flex items-end gap-2 border-b border-gray-200 pb-4">
          {chartData.map((data, index) => (
            <div key={index} className="flex-1 flex flex-col justify-end items-center gap-1 group relative">
              <div className="absolute -top-8 bg-slate-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {data.bookings} bookings
              </div>
              <div 
                className="w-full bg-emerald-100 hover:bg-emerald-200 rounded-t-lg transition-colors min-h-[4px]" 
                style={{ height: `${(data.bookings / maxBookings) * 100}%` }}
              />
              <span className="text-xs text-slate-500 mt-2">
                {new Date(data.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bookings Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {/* Tab Navigation */}
        <div className="border-b border-gray-100">
          <div className="flex">
            <button
              onClick={() => setActiveTab('today')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'today'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Today's Bookings ({todayBookings.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'upcoming'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Upcoming Bookings ({upcomingBookings.length})
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'today' ? (
            todayBookings.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-slate-500">No bookings for today</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todayBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-medium text-slate-900">{booking.customer_name}</p>
                        <span className="text-sm text-slate-500">•</span>
                        <p className="text-sm text-slate-600">{booking.room?.name}</p>
                      </div>
                      <p className="text-sm text-slate-500">
                        {formatDateRange(booking.check_in_date, booking.check_out_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">{formatCurrency(Number(booking.total_amount), company?.currency)}</p>
                        {booking.advance_paid > 0 && (
                          <p className="text-xs text-slate-500">
                            Advance: {formatCurrency(Number(booking.advance_paid), company?.currency)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => togglePaymentStatus(booking)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                          booking.is_paid
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        }`}
                      >
                        {booking.is_paid ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            Paid
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" />
                            Mark Paid
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            upcomingBookings.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-slate-500">No upcoming bookings</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-medium text-slate-900">{booking.customer_name}</p>
                        <span className="text-sm text-slate-500">•</span>
                        <p className="text-sm text-slate-600">{booking.room?.name}</p>
                      </div>
                      <p className="text-sm text-slate-500">
                        {formatDateRange(booking.check_in_date, booking.check_out_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">{formatCurrency(Number(booking.total_amount), company?.currency)}</p>
                        {booking.advance_paid > 0 && (
                          <p className="text-xs text-slate-500">
                            Advance: {formatCurrency(Number(booking.advance_paid), company?.currency)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => togglePaymentStatus(booking)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                          booking.is_paid
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        }`}
                      >
                        {booking.is_paid ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            Paid
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" />
                            Mark Paid
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}