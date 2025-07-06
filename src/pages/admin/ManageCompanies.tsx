import React, { useState, useEffect } from 'react';
import { Building2, Users, Calendar, DollarSign, Search, Eye, Edit, Trash2, Crown, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Company {
  id: string;
  name: string;
  logo_url?: string;
  address?: string;
  currency: string;
  tax_enabled: boolean;
  tax_rate: number;
  created_at: string;
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

      // Fetch companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (companiesError) throw companiesError;

      // Fetch additional data for each company
      const companiesWithStats = await Promise.all(
        (companiesData || []).map(async (company) => {
          // Get user count
          const { data: users } = await supabase
            .from('company_users')
            .select('id')
            .eq('company_id', company.id);

          // Get booking count and revenue
          const { data: bookings } = await supabase
            .from('bookings')
            .select('total_amount')
            .eq('company_id', company.id);

          const totalRevenue = bookings?.reduce((sum, booking) => sum + Number(booking.total_amount), 0) || 0;

          return {
            ...company,
            user_count: users?.length || 0,
            booking_count: bookings?.length || 0,
            total_revenue: totalRevenue,
          };
        })
      );

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
    company.currency.toLowerCase().includes(searchQuery.toLowerCase())
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
            placeholder="Search companies by name or currency..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 p-3 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Companies List */}
      {filteredCompanies.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            {searchQuery ? 'No companies found' : 'No companies yet'}
          </h3>
          <p className="text-slate-600">
            {searchQuery ? 'Try adjusting your search terms.' : 'Companies will appear here as users sign up.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCompanies.map((company) => (
            <div key={company.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    {company.logo_url ? (
                      <img
                        src={company.logo_url}
                        alt={`${company.name} logo`}
                        className="w-full h-full rounded-lg object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Building2 className="h-6 w-6 text-white" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-1">{company.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span>Created {formatDate(company.created_at)}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {company.currency}
                          </span>
                          {company.address && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {company.address}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium">
                          <Crown className="h-3 w-3" />
                          Free Plan
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-600">
                          {company.user_count} {company.user_count === 1 ? 'user' : 'users'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-600">
                          {company.booking_count} {company.booking_count === 1 ? 'booking' : 'bookings'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-600 font-medium">
                          {formatCurrency(company.total_revenue || 0, company.currency)}
                        </span>
                      </div>
                    </div>

                    {company.tax_enabled && (
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        Tax enabled ({company.tax_rate}%)
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleViewDetails(company)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCompany(company.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Company"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Company Detail Modal */}
      {showDetailModal && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Company Details</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                    <p className="text-slate-900">{selectedCompany.name}</p>
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

              {/* Tax Settings */}
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

              {/* Statistics */}
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
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
                >
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