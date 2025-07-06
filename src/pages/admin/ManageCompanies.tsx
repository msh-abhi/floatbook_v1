import React, { useState, useEffect } from 'react';
import { Building2, Users, Calendar, DollarSign, Search, Eye, Trash2, Crown, MapPin, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Company as BaseCompany, CompanyUser } from '../../types';

// Extend the base Company type to include the stats and admin email
interface Company extends BaseCompany {
  admin_email?: string;
  user_count?: number;
  booking_count?: number;
  total_revenue?: number;
}

export function ManageCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);

      // 1. Fetch all companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (companiesError) throw companiesError;

      // 2. Fetch all company_users to get admin emails and user counts
      const { data: companyUsersData, error: usersError } = await supabase
        .from('company_users')
        .select('company_id, user_email, role');

      if (usersError) throw usersError;

      // 3. Fetch all bookings to calculate revenue and booking counts
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('company_id, total_amount');

      if (bookingsError) throw bookingsError;

      // 4. Process the data efficiently
      const statsMap = new Map<string, { user_count: number; admin_email?: string; booking_count: number; total_revenue: number }>();

      // Process users to find admins and count users per company
      companyUsersData?.forEach(user => {
        const stat = statsMap.get(user.company_id) || { user_count: 0, booking_count: 0, total_revenue: 0 };
        stat.user_count++;
        if (user.role === 'admin' && user.user_email) {
          stat.admin_email = user.user_email;
        }
        statsMap.set(user.company_id, stat);
      });

      // Process bookings to count bookings and sum revenue
      bookingsData?.forEach(booking => {
        const stat = statsMap.get(booking.company_id) || { user_count: 0, booking_count: 0, total_revenue: 0 };
        stat.booking_count++;
        stat.total_revenue += Number(booking.total_amount);
        statsMap.set(booking.company_id, stat);
      });

      // 5. Combine company data with the processed stats
      const companiesWithStats = (companiesData || []).map(company => ({
        ...company,
        ...statsMap.get(company.id),
      }));

      setCompanies(companiesWithStats);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleViewDetails = (company: Company) => {
    setSelectedCompany(company);
    setShowDetailModal(true);
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm('Are you sure you want to delete this company? This action cannot be undone and will delete all associated data.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyId);

      if (error) throw error;
      
      fetchCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
      alert('Error deleting company. Please try again.');
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (company.admin_email && company.admin_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (company.address && company.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-xl shadow-sm border h-24"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Manage Companies</h1>
          <p className="text-slate-600">
            View and manage all companies using your FloatBook platform.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">
            {companies.length} {companies.length === 1 ? 'company' : 'companies'}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by company, email, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 p-3 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Companies Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
           <table className="w-full text-left">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="p-4 text-sm font-semibold text-slate-600">Company</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Contact</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Stats</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Subscription</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((company) => (
                <tr key={company.id} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="p-4 align-top">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{company.name}</p>
                        <p className="text-xs text-slate-500">Joined {formatDate(company.created_at)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 align-top">
                     <div className="flex items-center gap-2 mb-1">
                      <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-600">{company.admin_email || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-600">{company.address || 'No address'}</span>
                    </div>
                  </td>
                   <td className="p-4 align-top text-sm">
                     <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-slate-400" />
                        <span>{company.user_count || 0} users</span>
                     </div>
                     <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>{company.booking_count || 0} bookings</span>
                     </div>
                   </td>
                   <td className="p-4 align-top">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium">
                        <Crown className="h-3 w-3" />
                        Free Plan
                      </span>
                   </td>
                  <td className="p-4 align-top">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleViewDetails(company)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="View Details">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeleteCompany(company.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete Company">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCompanies.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No companies found</h3>
              <p className="text-slate-600">Try adjusting your search terms.</p>
            </div>
          )}
        </div>
      </div>


      {/* Company Detail Modal */}
      {showDetailModal && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Company Details</h2>
                <button onClick={() => setShowDetailModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-lg">
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                    <p className="text-slate-900">{selectedCompany.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Admin Email</label>
                    <p className="text-slate-900">{selectedCompany.admin_email || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                    <p className="text-slate-900">{selectedCompany.currency}</p>
                  </div>
                   {selectedCompany.address && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                      <p className="text-slate-900">{selectedCompany.address}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Created</label>
                    <p className="text-slate-900">{formatDate(selectedCompany.created_at)}</p>
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company ID</label>
                    <p className="text-slate-500 text-sm font-mono">{selectedCompany.id}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-4">Tax Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tax Enabled</label>
                    <p className="text-slate-900">{selectedCompany.tax_enabled ? 'Yes' : 'No'}</p>
                  </div>
                  {selectedCompany.tax_enabled && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Tax Rate</label>
                      <p className="text-slate-900">{selectedCompany.tax_rate}%</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-4">Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-slate-700 mb-1">Users</p>
                    <p className="text-2xl font-bold text-slate-900">{selectedCompany.user_count}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-slate-700 mb-1">Bookings</p>
                    <p className="text-2xl font-bold text-slate-900">{selectedCompany.booking_count}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-slate-700 mb-1">Revenue</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(selectedCompany.total_revenue || 0, selectedCompany.currency)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100">
              <div className="flex justify-end">
                <button onClick={() => setShowDetailModal(false)} className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}