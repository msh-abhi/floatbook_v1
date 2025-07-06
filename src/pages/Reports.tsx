import React, { useState, useEffect } from 'react';
import { BarChart2, Calendar, Users, TrendingUp, Download, DoorOpen, Percent, RefreshCw, CircleDollarSign } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCompany } from '../hooks/useCompany';
import { supabase } from '../lib/supabase';
import { Room, ReportDailyStat, ReportRoomStat, ReportFinancialSummary, ReportDiscount, ReportOccupancy } from '../types';
import { formatCurrency } from '../utils/currency';

type DatePreset = 'today' | 'week' | 'month' | 'custom';
type PaymentStatus = 'all' | 'paid' | 'unpaid';
type DiscountStatus = 'all' | 'discounted' | 'not_discounted';

export function Reports() {
  const { companyId } = useAuth();
  const { company } = useCompany(companyId);
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([]);

  // Report Data States
  const [dailyStats, setDailyStats] = useState<ReportDailyStat[]>([]);
  const [roomStats, setRoomStats] = useState<ReportRoomStat[]>([]);
  const [financialSummary, setFinancialSummary] = useState<ReportFinancialSummary | null>(null);
  const [discountReport, setDiscountReport] = useState<ReportDiscount[]>([]);
  const [occupancyReport, setOccupancyReport] = useState<ReportOccupancy | null>(null);

  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    newCustomers: 0,
    totalRoomsBooked: 0,
  });

  // Filter States
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 29)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('all');
  const [discountStatus, setDiscountStatus] = useState<DiscountStatus>('all');

  // Fetch rooms for filter dropdown
  useEffect(() => {
    const fetchRooms = async () => {
      if (!companyId) return;
      const { data } = await supabase.from('rooms').select('*').eq('company_id', companyId).order('name');
      setRooms(data || []);
    };
    fetchRooms();
  }, [companyId]);

  // Fetch report data when filters change
  useEffect(() => {
    if (companyId) {
      fetchReportData();
    }
  }, [companyId, dateRange, selectedRoom, paymentStatus, discountStatus]);
  
  // Update date range based on presets
  useEffect(() => {
    const today = new Date();
    let startDate = new Date();
    if (datePreset === 'today') {
      startDate = today;
    } else if (datePreset === 'week') {
      startDate.setDate(today.getDate() - 6);
    } else if (datePreset === 'month') {
      startDate.setDate(today.getDate() - 29);
    }
    
    if (datePreset !== 'custom') {
      setDateRange({
        start: startDate.toISOString().split('T')[0],
        end: today.toISOString().split('T')[0],
      });
    }
  }, [datePreset]);

  const fetchReportData = async () => {
    if (!companyId) return;
    setLoading(true);

    const rpcParams = {
      company_id_param: companyId,
      start_date: dateRange.start,
      end_date: dateRange.end,
      room_ids_param: selectedRoom === 'all' ? null : [selectedRoom],
      payment_status_param: paymentStatus,
      discount_status_param: discountStatus,
    };

    try {
      const [
        dailyStatsResult,
        roomStatsResult,
        financialSummaryResult,
        discountReportResult,
        occupancyReportResult
      ] = await Promise.all([
        supabase.rpc('get_daily_booking_stats', rpcParams),
        supabase.rpc('get_room_stats', rpcParams),
        supabase.rpc('get_financial_summary', rpcParams),
        supabase.rpc('get_discount_report', { ...rpcParams, discount_status_param: undefined }),
        supabase.rpc('get_occupancy_report', { ...rpcParams, payment_status_param: undefined, discount_status_param: undefined }),
      ]);

      if (dailyStatsResult.error) throw dailyStatsResult.error;
      if (roomStatsResult.error) throw roomStatsResult.error;
      if (financialSummaryResult.error) throw financialSummaryResult.error;
      if (discountReportResult.error) throw discountReportResult.error;
      if (occupancyReportResult.error) throw occupancyReportResult.error;

      setDailyStats(dailyStatsResult.data || []);
      setRoomStats(roomStatsResult.data || []);
      setFinancialSummary(financialSummaryResult.data?.[0] || null);
      setDiscountReport(discountReportResult.data || []);
      setOccupancyReport(occupancyReportResult.data?.[0] || null);

      calculateSummary(dailyStatsResult.data || [], roomStatsResult.data || []);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (dailyData: ReportDailyStat[], roomData: ReportRoomStat[]) => {
    const summaryData = dailyData.reduce(
      (acc, day) => {
        acc.totalRevenue += Number(day.total_revenue);
        acc.totalBookings += Number(day.total_bookings);
        acc.newCustomers += Number(day.new_customers);
        return acc;
      },
      { totalRevenue: 0, totalBookings: 0, newCustomers: 0 }
    );
    setSummary({
      ...summaryData,
      totalRoomsBooked: roomData.length
    });
  };

  const handleResetFilters = () => {
    setDatePreset('month');
    setSelectedRoom('all');
    setPaymentStatus('all');
    setDiscountStatus('all');
  };
  
  const summaryCards = [
    { title: 'Total Revenue', value: formatCurrency(summary.totalRevenue, company?.currency), icon: CircleDollarSign, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    { title: 'Total Bookings', value: summary.totalBookings.toString(), icon: Calendar, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    { title: 'Rooms with Bookings', value: summary.totalRoomsBooked.toString(), icon: DoorOpen, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    { title: 'New Customers', value: summary.newCustomers.toString(), icon: Users, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    { title: 'Occupancy Rate', value: `${(occupancyReport?.occupancy_rate || 0).toFixed(1)}%`, icon: TrendingUp, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Reports & Analytics</h1>
          <p className="text-slate-600">Filter and analyze your booking data.</p>
        </div>
        <button className="bg-slate-700 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 self-start">
          <Download className="h-5 w-5" />
          Export Report
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="lg:col-span-2">
            <label className="text-sm font-medium text-slate-700">Date Range</label>
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg mt-1">
              <button onClick={() => setDatePreset('today')} className={`flex-1 py-2 px-3 text-sm rounded-md transition-colors ${datePreset === 'today' ? 'bg-white shadow text-emerald-600' : 'text-slate-600'}`}>Today</button>
              <button onClick={() => setDatePreset('week')} className={`flex-1 py-2 px-3 text-sm rounded-md transition-colors ${datePreset === 'week' ? 'bg-white shadow text-emerald-600' : 'text-slate-600'}`}>This Week</button>
              <button onClick={() => setDatePreset('month')} className={`flex-1 py-2 px-3 text-sm rounded-md transition-colors ${datePreset === 'month' ? 'bg-white shadow text-emerald-600' : 'text-slate-600'}`}>This Month</button>
            </div>
          </div>

          <div>
            <label htmlFor="room-filter" className="text-sm font-medium text-slate-700">Room</label>
            <select id="room-filter" value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)} className="w-full mt-1 p-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500">
              <option value="all">All Rooms</option>
              {rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="payment-filter" className="text-sm font-medium text-slate-700">Payment</label>
            <select id="payment-filter" value={paymentStatus} onChange={e => setPaymentStatus(e.target.value as PaymentStatus)} className="w-full mt-1 p-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500">
              <option value="all">All</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>

          <div>
            <label htmlFor="discount-filter" className="text-sm font-medium text-slate-700">Discount</label>
            <select id="discount-filter" value={discountStatus} onChange={e => setDiscountStatus(e.target.value as DiscountStatus)} className="w-full mt-1 p-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500">
              <option value="all">All</option>
              <option value="discounted">Discounted</option>
              <option value="not_discounted">Not Discounted</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button onClick={handleResetFilters} className="w-full bg-gray-200 text-slate-700 p-2 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-300">
              <RefreshCw className="h-4 w-4"/> Reset
            </button>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-600">Generating reports...</p>
        </div>
      ) : (
        <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {summaryCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.title} className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600 mb-1">{card.title}</p>
                        <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                      </div>
                      <div className={`${card.bgColor} ${card.color} p-3 rounded-lg`}>
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <CircleDollarSign className="h-5 w-5 text-emerald-600" />
                    Financial Summary
                  </h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center"> <p className="text-slate-600">Paid Revenue</p> <p className="font-semibold text-emerald-600">{formatCurrency(financialSummary?.paid_revenue || 0, company?.currency)}</p> </div>
                    <div className="flex justify-between items-center"> <p className="text-slate-600">Unpaid Revenue</p> <p className="font-semibold text-red-500">{formatCurrency(financialSummary?.unpaid_revenue || 0, company?.currency)}</p> </div>
                    <hr/>
                    <div className="flex justify-between items-center"> <p className="text-slate-600">Advance Paid</p> <p className="font-semibold text-emerald-600">{formatCurrency(financialSummary?.total_advance || 0, company?.currency)}</p> </div>
                    <div className="flex justify-between items-center"> <p className="text-slate-600">Due Amount</p> <p className="font-semibold text-orange-500">{formatCurrency(financialSummary?.total_due || 0, company?.currency)}</p> </div>
                  </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Percent className="h-5 w-5 text-emerald-600" />
                    Discount Report
                  </h2>
                  <div className="space-y-4">
                    {discountReport.map(item => (
                      <div key={item.discount_type} className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-slate-800 capitalize">{item.discount_type}</p>
                          <p className="text-sm text-slate-500">{item.booking_count} discounted bookings</p>
                        </div>
                        <p className="font-semibold text-emerald-600">{formatCurrency(item.total_discounted, company?.currency)}</p>
                      </div>
                    ))}
                    {discountReport.length === 0 && <p className="text-slate-500 text-center py-4">No discounts applied in this period.</p>}
                  </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Daily Bookings</h2>
                  <div className="h-80 flex items-end gap-2 border-b border-gray-200 pb-4">
                    {dailyStats.map(stat => (
                      <div key={stat.report_date} className="flex-1 flex flex-col justify-end items-center gap-1 group relative">
                        <div className="absolute -top-8 bg-slate-800 text-white text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {stat.total_bookings} bookings
                        </div>
                        <div 
                          className="w-full bg-emerald-100 hover:bg-emerald-200 rounded-t-lg transition-colors" 
                          style={{ height: `${(stat.total_bookings / (Math.max(...dailyStats.map(s => s.total_bookings), 1) || 1)) * 100}%` }}>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-xs text-slate-500">{new Date(dateRange.start + 'T00:00:00').toLocaleDateString()}</span>
                    <span className="text-xs text-slate-500">{new Date(dateRange.end + 'T00:00:00').toLocaleDateString()}</span>
                  </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Room Performance</h2>
                  <div className="space-y-4">
                    {roomStats.map(room => (
                      <div key={room.room_name}>
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <p className="font-medium text-slate-800">{room.room_name}</p>
                            <p className="text-sm text-slate-500">{room.total_bookings} bookings</p>
                          </div>
                          <p className="font-semibold text-emerald-600">{formatCurrency(room.total_revenue, company?.currency)}</p>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                           <div className="bg-emerald-600 h-2.5 rounded-full" style={{width: `${(room.total_bookings / (Math.max(...roomStats.map(r => r.total_bookings), 1) || 1)) * 100}%`}}></div>
                        </div>
                      </div>
                    ))}
                     {roomStats.length === 0 && <p className="text-slate-500 text-center py-4">No room bookings in this period.</p>}
                  </div>
              </div>
            </div>
        </div>
      )}
    </div>
  );
}

export default Reports;