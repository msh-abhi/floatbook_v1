import React, { useState, useEffect } from 'react';
import { Building2, Users, Calendar, DollarSign, Search, Eye, Edit, Trash2, Crown, MapPin, Mail, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Company as BaseCompany, CompanyUser } from '../../types';

// Extend the base Company type to include stats and admin email
interface Company extends BaseCompany {
  admin_email?: string;
  user_count?: number;
  booking_count?: number;
  total_revenue?: number;
  is_active: boolean;
}

interface CompanyDetail extends Company {
  users: CompanyUser[];
}

export function ManageCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [selectedCompany, setSelectedCompany] = useState<CompanyDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editForm, setEditForm] = useState({ name: '', address: '' });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);

      const { data: companiesData, error: companiesError } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
      if (companiesError) throw companiesError;

      const { data: companyUsersData, error: usersError } = await supabase.from('company_users').select('company_id, user_email, role');
      if (usersError) throw usersError;

      const { data: bookingsData, error: bookingsError } = await supabase.from('bookings').select('company_id, total_amount');
      if (bookingsError) throw bookingsError;

      const statsMap = new Map<string, { user_count: number; admin_email?: string; booking_count: number; total_revenue: number }>();

      companyUsersData?.forEach(user => {
        const stat = statsMap.get(user.company_id) || { user_count: 0, booking_count: 0, total_revenue: 0 };
        stat.user_count++;
        if (user.role === 'admin' && user.user_email) {
          stat.admin_email = user.user_email;
        }
        statsMap.set(user.company_id, stat);
      });

      bookingsData?.forEach(booking => {
        const stat = statsMap.get(booking.company_id) || { user_count: 0, booking_count: 0, total_revenue: 0 };
        stat.booking_count++;
        stat.total_revenue += Number(booking.total_amount);
        statsMap.set(booking.company_id, stat);
      });

      const companiesWithStats = (companiesData || []).map(company => ({
        ...company,
        ...statsMap.get(company.id),
      }));
      // @ts-ignore
      setCompanies(companiesWithStats);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleViewDetails = async (company: Company) => {
    const { data: users, error } = await supabase.from('company_users').select('*').eq('company_id', company.id);
    if (error) {
      console.error("Failed to fetch users for company");
      return;
    }
    setSelectedCompany({ ...company, users: users || [] });
    setShowDetailModal(true);
  };

  const handleEditClick = (company: Company) => {
    setEditingCompany(company);
    setEditForm({ name: company.name, address: company.address || '' });
    setShowEditModal(true);
  };
  
  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    const { error } = await supabase.from('companies').update({ name: editForm.name, address: editForm.address }).eq('id', editingCompany.id);
    if (error) {
      alert("Failed to update company.");
    } else {
      setShowEditModal(false);
      setEditingCompany(null);
      fetchCompanies();
    }
  };
  
  const handleToggleCompanyStatus = async (company: Company) => {
    const newStatus = !company.is_active;
    const { error } = await supabase.from('companies').update({ is_active: newStatus }).eq('id', company.id);
    if (error) {
      alert("Failed to update company status.");
    } else {
      fetchCompanies();
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm('Are you sure? This will delete the company and all associated data permanently.')) return;
    const { error } = await supabase.from('companies').delete().eq('id', companyId);
    if (error) {
      alert('Error deleting company.');
    } else {
      fetchCompanies();
    }
  };

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.admin_email && c.admin_email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatCurrency = (amount: number, currency: string = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Manage Companies</h1>
      
      {/* Search and other header elements here */}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
           <table className="w-full text-left">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="p-4 text-sm font-semibold text-slate-600">Company</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Contact</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Stats</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Status</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((company) => (
                <tr key={company.id} className={`border-b last:border-b-0 hover:bg-gray-50 ${!company.is_active ? 'bg-red-50 text-slate-500' : ''}`}>
                  <td className="p-4 align-top">
                    <p className="font-semibold text-slate-800">{company.name}</p>
                    <p className="text-xs">Joined {formatDate(company.created_at)}</p>
                  </td>
                  <td className="p-4 align-top">
                     <div className="flex items-center gap-2 mb-1">
                      <Mail className="h-4 w-4 text-slate-400"/>
                      <span className="text-sm">{company.admin_email || 'N/A'}</span>
                    </div>
                  </td>
                   <td className="p-4 align-top text-sm">
                     <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-slate-400" />
                        <span>{company.user_count || 0} users</span>
                     </div>
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>{company.booking_count || 0} bookings</span>
                     </div>
                     <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-slate-400" />
                        <span>{formatCurrency(company.total_revenue || 0, company.currency)}</span>
                     </div>
                   </td>
                   <td className="p-4 align-top">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={company.is_active} onChange={() => handleToggleCompanyStatus(company)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                   </td>
                  <td className="p-4 align-top">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleViewDetails(company)} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg" title="View Details"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => handleEditClick(company)} className="p-2 text-slate-400 hover:text-emerald-600 rounded-lg" title="Edit Company"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => handleDeleteCompany(company.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg" title="Delete Company"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Edit Modal */}
      {showEditModal && editingCompany && (
         <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b"><h2 className="text-xl font-semibold">Edit {editingCompany.name}</h2></div>
            <form onSubmit={handleUpdateCompany} className="p-6 space-y-4">
               <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                  <input id="companyName" type="text" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} required className="w-full px-4 py-3 border rounded-lg"/>
                </div>
                <div>
                  <label htmlFor="companyAddress" className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                  <input id="companyAddress" type="text" value={editForm.address} onChange={(e) => setEditForm({...editForm, address: e.target.value})} className="w-full px-4 py-3 border rounded-lg"/>
                </div>
                <div className="flex gap-3 pt-4 border-t">
                    <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-3 border rounded-lg">Cancel</button>
                    <button type="submit" className="flex-1 bg-emerald-600 text-white rounded-lg">Save Changes</button>
                </div>
            </form>
          </div>
        </div>
      )}
      
      {/* THIS IS THE CORRECTED DETAIL MODAL */}
      {showDetailModal && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Company Details</h2>
              <button onClick={() => setShowDetailModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5"/></button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Company Name</label>
                    <p className="text-slate-900">{selectedCompany.name}</p>
                  </div>
                   <div>
                    <label className="block font-medium text-slate-700 mb-1">Admin Email</label>
                    <p className="text-slate-900">{selectedCompany.admin_email || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Currency</label>
                    <p className="text-slate-900">{selectedCompany.currency}</p>
                  </div>
                  {selectedCompany.address && (
                    <div className="md:col-span-2">
                      <label className="block font-medium text-slate-700 mb-1">Address</label>
                      <p className="text-slate-900">{selectedCompany.address}</p>
                    </div>
                  )}
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Created</label>
                    <p className="text-slate-900">{formatDate(selectedCompany.created_at)}</p>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Company ID</label>
                    <p className="text-slate-500 font-mono">{selectedCompany.id}</p>
                  </div>
                </div>
              </div>

              {/* Tax Settings */}
              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-4">Tax Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Tax Enabled</label>
                    <p className="text-slate-900">{selectedCompany.tax_enabled ? 'Yes' : 'No'}</p>
                  </div>
                  {selectedCompany.tax_enabled && (
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Tax Rate</label>
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
                    <p className="text-2xl font-bold text-slate-900">{selectedCompany.user_count || 0}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-slate-700 mb-1">Bookings</p>
                    <p className="text-2xl font-bold text-slate-900">{selectedCompany.booking_count || 0}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-slate-700 mb-1">Revenue</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(selectedCompany.total_revenue || 0, selectedCompany.currency)}
                    </p>
                  </div>
                </div>
              </div>

              {/* User List */}
               <div>
                <h3 className="text-lg font-medium text-slate-900 mb-4">Users in Company</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                  {selectedCompany.users.length > 0 ? selectedCompany.users.map(user => (
                    <div key={user.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                      <span className="text-sm">{user.user_email}</span>
                      <span className="text-xs font-semibold uppercase text-slate-500">{user.role}</span>
                    </div>
                  )) : <p className="text-sm text-slate-500">No users found for this company.</p>}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50 text-right">
              <button onClick={() => setShowDetailModal(false)} className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}