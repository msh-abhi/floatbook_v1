import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { User, Mail, Key } from 'lucide-react';

interface AppUser {
  id: string;
  email: string;
  created_at: string;
  is_active: boolean;
  company_name?: string;
}

export function ManageUsers() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: usersData, error: usersError } = await supabase.from('users').select('*');
      if (usersError) throw usersError;

      const { data: companyUsersData, error: companyUsersError } = await supabase.from('company_users').select('user_id, companies(name)');
      if (companyUsersError) throw companyUsersError;
      
      const companyMap = new Map();
      // @ts-ignore
      companyUsersData.forEach(cu => companyMap.set(cu.user_id, cu.companies.name));

      // @ts-ignore
      const combined = usersData.map(u => ({ ...u, company_name: companyMap.get(u.id) || 'N/A' }));
      
      setUsers(combined);
    } catch (error) { console.error("Error fetching users:", error); } 
    finally { setLoading(false); }
  };

  const handleToggleUserStatus = async (user: AppUser) => {
    const newStatus = !user.is_active;
    const { error } = await supabase.from('users').update({ is_active: newStatus }).eq('id', user.id);
    if (error) { alert('Failed to update user status.'); }
    else { fetchUsers(); }
  };
  
  const handleResetPassword = async (email: string) => {
    if (!confirm(`Send a password reset link to ${email}?`)) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) { alert("Failed to send reset link: " + error.message); }
    else { alert("Password reset link sent successfully!"); }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Manage Users</h1>
      
       <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
           <table className="w-full text-left">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="p-4 text-sm font-semibold text-slate-600">User Email</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Company</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Status</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className={`border-b last:border-b-0 hover:bg-gray-50 ${!user.is_active ? 'bg-red-50' : ''}`}>
                  <td className="p-4"><p className="font-medium text-slate-800">{user.email}</p><p className="text-xs text-slate-500">Joined: {formatDate(user.created_at)}</p></td>
                  <td className="p-4 text-sm">{user.company_name}</td>
                   <td className="p-4">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={user.is_active} onChange={() => handleToggleUserStatus(user)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                   </td>
                  <td className="p-4">
                    <button onClick={() => handleResetPassword(user.email)} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg" title="Reset Password"><Key className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}