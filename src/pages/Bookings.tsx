import React, { useState, useEffect, useMemo } from 'react';
import { CreditCard, Plus, Edit, Trash2, Calendar, Mail, Phone, CheckCircle, Clock, Percent, UserCheck, CircleDollarSign, Users, Ship, Search, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useCompany } from '../hooks/useCompany';
import { Booking, Room, BookingFilters } from '../types';
import { formatCurrency } from '../utils/currency';
import { BookingDetailModal } from '../components/BookingDetailModal';

export function Bookings() {
  const { companyId } = useAuth();
  const { company } = useCompany(companyId);
  const [bookings, setBookings] = useState<(Booking & { room: Room })[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  const initialFormData = {
    room_id: '', check_in_date: '', check_out_date: '', customer_name: '',
    customer_email: '', customer_phone: '', total_amount: '',
    discount_type: 'fixed' as 'fixed' | 'percentage', discount_value: '0',
    advance_paid: '0', referred_by: '', notes: '', guest_count: '1', booking_type: 'individual',
  };
  const [formData, setFormData] = useState(initialFormData);
  
  const [filters, setFilters] = useState<BookingFilters>({ query: '', paymentStatus: 'all' });

  useEffect(() => {
    if (companyId) {
      fetchData();
    }
  }, [companyId]);

  useEffect(() => {
    if (formData.room_id && !editingBooking) {
      const selectedRoom = rooms.find(room => room.id === formData.room_id);
      if (selectedRoom) {
        setFormData(prev => ({ ...prev, total_amount: selectedRoom.price.toString() }));
      }
    }
  }, [formData.room_id, rooms, editingBooking]);

  const fetchData = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const { data: bookingsData, error: bookingsError } = await supabase.from('bookings').select(`*, room:rooms(*)`).eq('company_id', companyId).order('check_in_date', { ascending: false });
      if (bookingsError) throw bookingsError;
      const { data: roomsData, error: roomsError } = await supabase.from('rooms').select('*').eq('company_id', companyId).order('name');
      if (roomsError) throw roomsError;
      setBookings(bookingsData || []);
      setRooms(roomsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTaxAndTotal = () => {
    const baseAmount = parseFloat(formData.total_amount) || 0;
    const discountValue = parseFloat(formData.discount_value) || 0;
    const advancePaid = parseFloat(formData.advance_paid) || 0;
    
    const discountAmount = formData.discount_type === 'percentage' 
      ? (baseAmount * discountValue) / 100 
      : discountValue;
    
    const discountedAmount = baseAmount - discountAmount;
    const taxAmount = company?.tax_enabled ? (discountedAmount * (company.tax_rate || 0)) / 100 : 0;
    const finalTotal = discountedAmount + taxAmount;
    const dueAmount = Math.max(0, finalTotal - advancePaid);

    return { discountAmount, taxAmount, finalTotal, dueAmount };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    try {
      const { finalTotal } = calculateTaxAndTotal();
      const bookingData = {
        company_id: companyId, room_id: formData.room_id, check_in_date: formData.check_in_date,
        check_out_date: formData.check_out_date, customer_name: formData.customer_name,
        customer_email: formData.customer_email || null, customer_phone: formData.customer_phone || null,
        total_amount: parseFloat(formData.total_amount), discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value), advance_paid: parseFloat(formData.advance_paid),
        referred_by: formData.referred_by || null, notes: formData.notes || null,
        guest_count: parseInt(formData.guest_count), booking_type: formData.booking_type,
        is_paid: finalTotal <= parseFloat(formData.advance_paid),
      };

      if (editingBooking) {
        await supabase.from('bookings').update(bookingData).eq('id', (editingBooking as any).id);
      } else {
        await supabase.from('bookings').insert([bookingData]);
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving booking:', error);
      alert('Error saving booking. Please try again.');
    }
  };

  const handleEdit = (booking: Booking & { room: Room }) => {
    setEditingBooking(booking);
    setFormData({
      room_id: booking.room_id,
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      customer_name: booking.customer_name,
      customer_email: booking.customer_email || '',
      customer_phone: booking.customer_phone || '',
      total_amount: booking.total_amount.toString(),
      discount_type: booking.discount_type || 'fixed',
      discount_value: booking.discount_value?.toString() || '0',
      advance_paid: booking.advance_paid?.toString() || '0',
      referred_by: booking.referred_by || '',
      notes: booking.notes || '',
      guest_count: (booking.guest_count || 1).toString(),
      booking_type: booking.booking_type || 'individual',
    });
    setShowModal(true);
  };

  const handleDelete = async (bookingId: string) => {
    if (window.confirm('Are you sure you want to delete this booking?')) {
      await supabase.from('bookings').delete().eq('id', bookingId);
      fetchData();
    }
  };

  const handleViewDetails = (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setShowDetailModal(true);
  };

  const togglePaymentStatus = async (booking: Booking) => {
    await supabase.from('bookings').update({ is_paid: !booking.is_paid }).eq('id', booking.id);
    fetchData();
  };
  
  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
      const query = filters.query.toLowerCase();
      const matchesQuery = (
        booking.customer_name.toLowerCase().includes(query) ||
        booking.room?.name.toLowerCase().includes(query) ||
        (booking.referred_by && booking.referred_by.toLowerCase().includes(query))
      );
      
      const matchesPayment = (
        filters.paymentStatus === 'all' ||
        (filters.paymentStatus === 'paid' && booking.is_paid) ||
        (filters.paymentStatus === 'unpaid' && !booking.is_paid)
      );

      return matchesQuery && matchesPayment;
    });
  }, [bookings, filters]);

  const resetForm = () => setFormData(initialFormData);
  const openModal = () => { setEditingBooking(null); resetForm(); setShowModal(true); };
  const formatDateRange = (checkIn: string, checkOut: string) => `${new Date(checkIn + 'T00:00:00').toLocaleDateString()} - ${new Date(checkOut + 'T00:00:00').toLocaleDateString()}`;

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Bookings</h1>
          <p className="text-slate-600">Manage your room bookings and customer information.</p>
        </div>
        <button onClick={openModal} className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-3 rounded-lg font-medium hover:from-emerald-700 hover:to-emerald-800 shadow-lg flex items-center gap-2 self-start">
          <Plus className="h-5 w-5" /> New Booking
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer, room, or referral..."
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              className="w-full pl-10 p-3 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <select
              value={filters.paymentStatus}
              onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value as any })}
              className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Payment Statuses</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
        </div>
      </div>

      {filteredBookings.length === 0 ? (
        <div className="text-center py-12">
          <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No bookings found</h3>
          <p className="text-slate-600">Try adjusting your filters or create a new booking.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <div key={booking.id} className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center"><Calendar className="h-6 w-6 text-emerald-600" /></div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{booking.customer_name}</h3>
                    <p className="text-sm text-slate-600">{booking.room?.name}</p>
                    <p className="text-sm text-slate-500">{formatDateRange(booking.check_in_date, booking.check_out_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => togglePaymentStatus(booking)} className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${booking.is_paid ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {booking.is_paid ? <><CheckCircle className="h-3 w-3"/>Paid</> : <><Clock className="h-3 w-3"/>Pending</>}
                  </button>
                  <button onClick={() => handleViewDetails(booking.id)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Details">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleEdit(booking)} className="p-2 text-slate-400 hover:text-emerald-600"><Edit className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(booking.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
                {booking.customer_email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400"/><span>{booking.customer_email}</span></div>}
                {booking.customer_phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400"/><span>{booking.customer_phone}</span></div>}
                <div className="flex items-center gap-2"><CircleDollarSign className="h-4 w-4 text-slate-400"/><span className="font-semibold text-slate-800">{formatCurrency(Number(booking.total_amount), company?.currency)}</span></div>
                {booking.advance_paid > 0 && <div className="flex items-center gap-2"><span className="text-xs">Advance:</span><span className="font-medium text-emerald-600">{formatCurrency(Number(booking.advance_paid), company?.currency)}</span></div>}
                {booking.referred_by && <div className="flex items-center gap-2"><UserCheck className="h-4 w-4 text-slate-400"/><span>Referred by: {booking.referred_by}</span></div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b"><h2 className="text-xl font-semibold">{editingBooking ? 'Edit Booking' : 'Create New Booking'}</h2></div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
                {/* --- Left Column --- */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label htmlFor="check_in_date" className="block text-sm font-medium text-slate-700 mb-1">Check-in Date *</label><input id="check_in_date" type="date" value={formData.check_in_date} onChange={(e) => setFormData({ ...formData, check_in_date: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"/></div>
                    <div><label htmlFor="check_out_date" className="block text-sm font-medium text-slate-700 mb-1">Check-out Date *</label><input id="check_out_date" type="date" value={formData.check_out_date} onChange={(e) => setFormData({ ...formData, check_out_date: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"/></div>
                  </div>
                  <div><label htmlFor="customer_name" className="block text-sm font-medium text-slate-700 mb-1">Customer Name *</label><input id="customer_name" type="text" value={formData.customer_name} onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder="Enter customer name"/></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label htmlFor="customer_email" className="block text-sm font-medium text-slate-700 mb-1">Customer Email</label><input id="customer_email" type="email" value={formData.customer_email} onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder="customer@email.com"/></div>
                    <div><label htmlFor="customer_phone" className="block text-sm font-medium text-slate-700 mb-1">Customer Phone</label><input id="customer_phone" type="tel" value={formData.customer_phone} onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder="+1 (555) 000-0000"/></div>
                  </div>
                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                    <input id="notes" type="text" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder="Any additional notes..."/>
                  </div>
                </div>
                {/* --- Right Column --- */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label htmlFor="room_id" className="block text-sm font-medium text-slate-700 mb-1">Room *</label><select id="room_id" value={formData.room_id} onChange={(e) => setFormData({ ...formData, room_id: e.target.value })} required className="w-full p-2.5 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-emerald-500"><option value="">Select a room</option>{rooms.map((room) => ( <option key={room.id} value={room.id}> {room.name} </option> ))}</select></div>
                    <div><label htmlFor="guest_count" className="block text-sm font-medium text-slate-700 mb-1">Guests *</label><input id="guest_count" type="number" min="1" value={formData.guest_count} onChange={(e) => setFormData({ ...formData, guest_count: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"/></div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Booking Type</label>
                    <div className="flex rounded-lg bg-gray-100 p-1"><button type="button" onClick={() => setFormData({...formData, booking_type: 'individual'})} className={`flex-1 py-2 px-4 text-sm rounded-md flex items-center justify-center gap-2 ${formData.booking_type === 'individual' ? 'bg-white shadow' : ''}`}><Users className="h-4 w-4"/> Individual</button><button type="button" onClick={() => setFormData({...formData, booking_type: 'full_boat'})} className={`flex-1 py-2 px-4 text-sm rounded-md flex items-center justify-center gap-2 ${formData.booking_type === 'full_boat' ? 'bg-white shadow' : ''}`}><Ship className="h-4 w-4"/> Full Boat</button></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label htmlFor="total_amount" className="block text-sm font-medium text-slate-700 mb-1">Base Price</label><input id="total_amount" type="number" step="0.01" min="0" value={formData.total_amount} onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-emerald-500"/></div>
                    <div><label htmlFor="advance_paid" className="block text-sm font-medium text-slate-700 mb-1">Advance Paid</label><input id="advance_paid" type="number" step="0.01" min="0" value={formData.advance_paid} onChange={(e) => setFormData({ ...formData, advance_paid: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"/></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Discount</label>
                        <div className="flex"><input type="number" step="0.01" min="0" value={formData.discount_value} onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-emerald-500"/><button type="button" onClick={() => setFormData({ ...formData, discount_type: formData.discount_type === 'fixed' ? 'percentage' : 'fixed' })} className={`px-4 py-3 border-t border-b border-r border-gray-300 rounded-r-lg flex items-center gap-2 ${formData.discount_type === 'percentage' ? 'bg-emerald-50' : 'bg-gray-50'}`}>{formData.discount_type === 'percentage' ? <Percent className="h-4 w-4"/> : <CircleDollarSign className="h-4 w-4" />}</button></div>
                      </div>
                      <div><label htmlFor="referred_by" className="block text-sm font-medium text-slate-700 mb-1">Referred By</label><input id="referred_by" type="text" value={formData.referred_by} onChange={(e) => setFormData({ ...formData, referred_by: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder="e.g. John Doe"/></div>
                  </div>
                  
                  {/* Enhanced Financial Summary */}
                  <div className="p-4 bg-gradient-to-r from-emerald-50 to-stone-50 rounded-lg border border-emerald-100">
                    <h4 className="font-semibold text-slate-900 mb-3">Booking Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Base Amount:</span>
                        <span className="font-medium">{formatCurrency(parseFloat(formData.total_amount) || 0, company?.currency)}</span>
                      </div>
                      {parseFloat(formData.discount_value) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Discount ({formData.discount_type === 'percentage' ? `${formData.discount_value}%` : 'Fixed'}):</span>
                          <span className="font-medium text-red-600">-{formatCurrency(calculateTaxAndTotal().discountAmount, company?.currency)}</span>
                        </div>
                      )}
                      {company?.tax_enabled && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Tax ({company.tax_rate}%):</span>
                          <span className="font-medium text-slate-900">+{formatCurrency(calculateTaxAndTotal().taxAmount, company?.currency)}</span>
                        </div>
                      )}
                      <hr className="border-gray-200" />
                      <div className="flex justify-between">
                        <span className="text-slate-600 font-medium">Total Amount:</span>
                        <span className="text-lg font-bold text-emerald-700">{formatCurrency(calculateTaxAndTotal().finalTotal, company?.currency)}</span>
                      </div>
                      {parseFloat(formData.advance_paid) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Advance Paid:</span>
                          <span className="font-medium text-emerald-600">{formatCurrency(parseFloat(formData.advance_paid), company?.currency)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-600 font-medium">Amount Due:</span>
                        <span className="text-lg font-bold text-orange-600">{formatCurrency(calculateTaxAndTotal().dueAmount, company?.currency)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100"><button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 border rounded-lg">Cancel</button><button type="submit" className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg">{editingBooking ? 'Update Booking' : 'Create Booking'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Booking Detail Modal */}
      {showDetailModal && selectedBookingId && companyId && (
        <BookingDetailModal
          bookingId={selectedBookingId}
          companyId={companyId}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedBookingId(null);
          }}
        />
      )}
    </div>
  );
}