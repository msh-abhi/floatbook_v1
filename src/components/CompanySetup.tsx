import React, { useState } from 'react';
import { Building2, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export function CompanySetup() {
  const [companyName, setCompanyName] = useState('');
  const [currency, setCurrency] = useState('USD'); // Add currency state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, refreshCompany } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !companyName.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Create the company in the database, now with currency
      const { data: company, error: companyInsertError } = await supabase
        .from('companies')
        .insert([{ name: companyName.trim(), currency: currency }]) // Add currency here
        .select()
        .single();

      if (companyInsertError) {
        throw new Error(companyInsertError.message);
      }

      // 2. Fetch the full, up-to-date user object to get the email
      const { data: { user: fullUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !fullUser) {
        throw new Error('Could not fetch user details. Please try again.');
      }

      // 3. Add the user to the company
      const { error: userInsertError } = await supabase
        .from('company_users')
        .insert([{
          company_id: company.id,
          user_id: fullUser.id,
          user_email: fullUser.email,
          role: 'admin'
        }]);

      if (userInsertError) {
        throw new Error(userInsertError.message);
      }

      // 4. Refresh the session to proceed to the dashboard
      await refreshCompany();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome to FloatBook!</h1>
          <p className="text-slate-600">
            Let's set up your company to get started
          </p>
        </div>

        {/* Setup Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Company Setup</h2>
            <p className="text-slate-600 text-sm">
              Create your company profile to start managing rooms and bookings.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-slate-700 mb-1">
                Company Name
              </label>
              <input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder="Enter your company name"
              />
            </div>

            {/* New Currency Field */}
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-slate-700 mb-1">
                Default Currency
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              >
                <option value="USD">USD ($)</option>
                <option value="BDT">BDT (৳)</option>
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">This will be the currency for all your bookings.</p>
            </div>

            <button
              type="submit"
              disabled={loading || !companyName.trim()}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-3 px-4 rounded-lg font-medium hover:from-emerald-700 hover:to-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating company...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Check className="h-5 w-5" />
                  Create Company
                </div>
              )}
            </button>
          </form>

          <div className="mt-6 p-4 bg-emerald-50 rounded-lg">
            <h3 className="text-sm font-medium text-slate-900 mb-2">What's next?</h3>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• Add rooms to your inventory</li>
              <li>• Start accepting bookings</li>
              <li>• Track your revenue and analytics</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}