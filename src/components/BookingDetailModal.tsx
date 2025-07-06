import React, { useState, useEffect } from 'react';
import { X, Calendar, Mail, Phone, Users, CircleDollarSign, MapPin, FileText, UserCheck, Ship, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../hooks/useCompany';
import { Booking, Room } from '../types';
import { formatCurrency } from '../utils/currency';

interface BookingDetailModalProps {
  bookingId: string;
  companyId: string;
  onClose: () => void;
}

export function BookingDetailModal({ bookingId, companyId, onClose }: BookingDetailModalProps) {
  const { company } = useCompany(companyId);
  const [booking, setBooking] = useState<(Booking & { room: Room }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);

  const fetchBookingDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          room:rooms(*)
        `)
        .eq('id', bookingId)
        .single();

      if (error) throw error;
      setBooking(data);
    } catch (error) {
      console.error('Error fetching booking details:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTaxAndTotal = () => {
    if (!booking || !company) return { taxAmount: 0, finalTotal: booking?.total_amount || 0 };

    const baseAmount = Number(booking.total_amount);
    const discountValue = Number(booking.discount_value) || 0;
    const discountAmount = booking.discount_type === 'percentage' 
      ? (baseAmount * discountValue) / 100 
      : discountValue;
    
    const discountedAmount = baseAmount - discountAmount;
    const taxAmount = company.tax_enabled ? (discountedAmount * (company.tax_rate || 0)) / 100 : 0;
    const finalTotal = discountedAmount + taxAmount;

    return { taxAmount, finalTotal, discountAmount };
  };

  const formatDateRange = (checkIn: string, checkOut: string) => {
    const checkInDate = new Date(checkIn + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const checkOutDate = new Date(checkOut + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    return `${checkInDate} - ${checkOutDate}`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 text-center">
          <p className="text-slate-600">Booking not found</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-200 text-slate-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const { taxAmount, finalTotal, discountAmount } = calculateTaxAndTotal();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-stone-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Booking Details</h2>
              <p className="text-slate-600">#{booking.id.slice(0, 8)}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Customer Information */}
          <div className="bg-gradient-to-r from-stone-50 to-emerald-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              Customer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-1">Name</p>
                <p className="text-slate-900 font-semibold">{booking.customer_name}</p>
              </div>
              {booking.customer_email && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Email</p>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <p className="text-slate-900">{booking.customer_email}</p>
                  </div>
                </div>
              )}
              {booking.customer_phone && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Phone</p>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <p className="text-slate-900">{booking.customer_phone}</p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-1">Guest Count</p>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-400" />
                  <p className="text-slate-900">{booking.guest_count} {booking.guest_count === 1 ? 'guest' : 'guests'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Information */}
          <div className="bg-gradient-to-r from-emerald-50 to-stone-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-600" />
              Booking Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-1">Room</p>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <p className="text-slate-900 font-semibold">{booking.room?.name}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 mb-1">Booking Type</p>
                <div className="flex items-center gap-2">
                  {booking.booking_type === 'full_boat' ? (
                    <Ship className="h-4 w-4 text-slate-400" />
                  ) : (
                    <Users className="h-4 w-4 text-slate-400" />
                  )}
                  <p className="text-slate-900 capitalize">{booking.booking_type.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm font-medium text-slate-700 mb-1">Dates</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <p className="text-slate-900">{formatDateRange(booking.check_in_date, booking.check_out_date)}</p>
                </div>
              </div>
              {booking.referred_by && (
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-slate-700 mb-1">Referred By</p>
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-slate-400" />
                    <p className="text-slate-900">{booking.referred_by}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Room Details */}
          {booking.room && (
            <div className="bg-gradient-to-r from-stone-50 to-emerald-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-emerald-600" />
                Room Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Capacity</p>
                  <p className="text-slate-900">{booking.room.capacity} {booking.room.capacity === 1 ? 'person' : 'people'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Base Price</p>
                  <p className="text-slate-900 font-semibold">{formatCurrency(booking.room.price, company?.currency)}</p>
                </div>
                {booking.room.amenities && booking.room.amenities.length > 0 && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-slate-700 mb-2">Amenities</p>
                    <div className="flex flex-wrap gap-2">
                      {booking.room.amenities.map((amenity, index) => (
                        <span key={index} className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {booking.room.meal_options && booking.room.meal_options !== 'None' && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-slate-700 mb-1">Meal Options</p>
                    <p className="text-slate-900">{booking.room.meal_options}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Financial Summary */}
          <div className="bg-gradient-to-r from-emerald-50 to-stone-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <CircleDollarSign className="h-5 w-5 text-emerald-600" />
              Financial Summary
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Base Amount</span>
                <span className="font-semibold text-slate-900">{formatCurrency(Number(booking.total_amount), company?.currency)}</span>
              </div>
              
              {discountAmount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">
                    Discount ({booking.discount_type === 'percentage' ? `${booking.discount_value}%` : 'Fixed'})
                  </span>
                  <span className="font-semibold text-red-600">-{formatCurrency(discountAmount, company?.currency)}</span>
                </div>
              )}

              {company?.tax_enabled && taxAmount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Tax ({company.tax_rate}%)</span>
                  <span className="font-semibold text-slate-900">+{formatCurrency(taxAmount, company?.currency)}</span>
                </div>
              )}

              <hr className="border-gray-200" />
              
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Total Amount</span>
                <span className="text-xl font-bold text-slate-900">{formatCurrency(finalTotal, company?.currency)}</span>
              </div>

              {booking.advance_paid > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Advance Paid</span>
                  <span className="font-semibold text-emerald-600">{formatCurrency(Number(booking.advance_paid), company?.currency)}</span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Amount Due</span>
                <span className="text-xl font-bold text-orange-600">
                  {formatCurrency(Math.max(0, finalTotal - Number(booking.advance_paid)), company?.currency)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-slate-600">Payment Status</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${
                  booking.is_paid 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  <CreditCard className="h-3 w-3" />
                  {booking.is_paid ? 'Paid' : 'Pending'}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {booking.notes && (
            <div className="bg-gradient-to-r from-stone-50 to-emerald-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600" />
                Notes
              </h3>
              <p className="text-slate-700 leading-relaxed">{booking.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}