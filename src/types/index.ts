export interface Company {
  id: string;
  name: string;
  logo_url?: string;
  address?: string;
  currency?: string;
  tax_enabled?: boolean;
  tax_rate?: number;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
}

export interface CompanyUser {
  id: string;
  company_id: string;
  user_id: string;
  role: string;
  created_at: string;
  user_email?: string;
  user?: User;
}

export interface Room {
  id: string;
  company_id: string;
  name: string;
  price: number;
  capacity: number;
  amenities?: string[];
  meal_options?: string;
  created_at: string;
}

export interface Booking {
  id: string;
  company_id: string;
  room_id: string;
  check_in_date: string;
  check_out_date: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  is_paid: boolean;
  total_amount: number;
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  advance_paid: number;
  referred_by?: string;
  notes?: string;
  guest_count: number;
  booking_type: string;
  created_at: string;
  room?: Room;
  tax_amount?: number;
  final_total_amount?: number;
}

// New Report Types
export interface ReportDailyStat {
  report_date: string;
  total_bookings: number;
  total_revenue: number;
  new_customers: number;
}

export interface ReportRoomStat {
  room_name: string;
  total_bookings: number;
  total_revenue: number;
}

export interface ReportFinancialSummary {
  paid_revenue: number;
  unpaid_revenue: number;
  total_advance: number;
  total_due: number;
}

export interface ReportDiscount {
  discount_type: 'fixed' | 'percentage';
  booking_count: number;
  total_discounted: number;
}

export interface ReportOccupancy {
  occupancy_rate: number;
} 

export interface BookingFilters {
  query: string;
  paymentStatus: 'all' | 'paid' | 'unpaid';
}