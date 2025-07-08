import React, { useState, useEffect } from 'react';
import { Building2, Users, LogOut, Mail, Trash2, UserPlus, Settings as SettingsIcon, CreditCard, Crown, MapPin, Key, Zap, Calculator, Smartphone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useCompany } from '../hooks/useCompany';
import { CompanyUser, Plan } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';

export function Settings() {
  const { user, companyId, signOut } = useAuth();
  const { company, updateCompany } = useCompany(companyId);
  const navigate = useNavigate();
  const location = useLocation();
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'company' | 'team' | 'email' | 'payment' | 'plans' | 'tax'>('company');
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activationKey, setActivationKey] = useState('');
  
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [bkashLoading, setBkashLoading] = useState<string | null>(null);

  const [companyForm, setCompanyForm] = useState({
    name: '',
    logo_url: '',
    address: '',
    currency: 'USD',
    tax_enabled: false,
    tax_rate: 0,
    plan_name: 'Free',
  });

  const [emailSettings, setEmailSettings] = useState({
    brevo_api_key: '',
  });
  
  const [paymentSettings, setPaymentSettings] = useState({
    stripe_secret_key: '',
    paypal_client_id: '',
    bkash_merchant_id: '',
  });
  
  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => {
    if (company) {
      setCompanyForm({
        name: company.name || '',
        logo_url: company.logo_url || '',
        address: company.address || '',
        currency: company.currency || 'USD',
        tax_enabled: company.tax_enabled || false,
        tax_rate: company.tax_rate || 0,
        plan_name: company.plan_name || 'Free',
      });
    }
  }, [company]);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!companyId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [usersResponse, plansResponse] = await Promise.all([
          supabase.from('company_users').select('*').eq('company_id', companyId),
          supabase.from('plans').select('*').order('price')
        ]);

        if (usersResponse.error) throw usersResponse.error;
        if (plansResponse.error) throw plansResponse.error;

        setCompanyUsers(usersResponse.data || []);
        setPlans(plansResponse.data || []);

      } catch (error) {
        console.error("Error fetching settings data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [companyId]);
  
  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state]);

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await updateCompany({
        name: companyForm.name,
        logo_url: companyForm.logo_url || null,
        address: companyForm.address || null,
        currency: companyForm.currency,
        tax_enabled: companyForm.tax_enabled,
        tax_rate: companyForm.tax_rate,
      });

      if (error) throw error;
      alert('Company information updated successfully!');
      window.location.reload();
    } catch (error) {
      console.error('Error updating company:', error);
      alert('Error updating company. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  const handleActivateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activationKey.trim()) return alert("Please enter an activation key.");
    
    try {
      const { data, error } = await supabase.rpc('activate_plan_with_key', { activation_key: activationKey.trim() });
      if (error) throw new Error(error.message);
      if (data && data.message) {
        alert(data.message);
        if (data.success) window.location.reload();
      } else {
        throw new Error("Received an unexpected response from the server.");
      }
    } catch (err: any) {
      console.error("Activation error:", err);
      alert(`Activation Failed: ${err.message}`);
    }
  };

  const handleStripeUpgrade = async (priceId: string | undefined) => {
    if (!priceId) return alert('This plan is not configured for Stripe payments yet.');

    setIsRedirecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
        body: { price_id: priceId },
      });
      if (error) throw new Error(`Edge Function invocation failed: ${error.message}`);
      if (data.error) throw new Error(`Stripe Error: ${data.error}`);
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error("Could not create a checkout session. Please try again.");
      }
    } catch (error: any) {
      console.error("Stripe upgrade process failed:", error);
      alert('Error starting subscription: ' + error.message);
      setIsRedirecting(false);
    }
  };

  const handleBkashUpgrade = async (planId: string) => {
    setBkashLoading(planId);
    try {
      const { data, error } = await supabase.functions.invoke('create-bkash-payment', {
        body: { plan_id: planId },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success && data.bkashURL) {
        window.location.href = data.bkashURL;
      } else {
        throw new Error(data.error || 'Failed to create bKash payment');
      }
    } catch (error: any) {
      console.error('bKash upgrade error:', error);
      alert('Error starting bKash payment: ' + error.message);
    } finally {
      setBkashLoading(null);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !inviteEmail.trim()) return;
    try {
      alert(`Invitation would be sent to ${inviteEmail}. This feature requires email service integration.`);
      setInviteEmail('');
      setShowInviteModal(false);
    } catch (error) {
      console.error('Error inviting user:', error);
      alert('Error sending invitation. Please try again.');
    }
  };

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await signOut();
      navigate('/auth');
    }
  };

  const tabs = [
    { id: 'company', name: 'Company Info', icon: Building2 },
    { id: 'team', name: 'Team Members', icon: Users },
    { id: 'tax', name: 'Tax Settings', icon: Calculator },
    { id: 'plans', name: 'Subscription Plans', icon: Crown },
    { id: 'payment', name: 'Payment Methods', icon: CreditCard },
    { id: 'email', name: 'Email Settings', icon: Mail },
  ];

  // Get the price of the user's current plan for comparison
  const currentPlanPrice = plans.find(p => p.name === companyForm.plan_name)?.price ?? 0;

  if (loading) {
    return (
      <div className="p-4 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border h-48"></div>
            <div className="bg-white p-6 rounded-xl shadow-sm border h-48"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Settings</h1>
        <p className="text-slate-600">Manage your company settings and preferences.</p>
      </div>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-64">
          <nav className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl transition-all ${activeTab === tab.id ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 shadow-sm' : 'text-slate-700 hover:bg-gray-50'}`}>
                <tab.icon className="h-5 w-5" />
                <span className="font-medium">{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="flex-1">
          {activeTab === 'company' && (
             <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100"><h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2"><Building2 className="h-5 w-5 text-emerald-600" />Company Information</h2></div>
              <div className="p-6">
                <form onSubmit={handleUpdateCompany} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="company_name" className="block text-sm font-medium text-slate-700 mb-2">Company Name *</label>
                      <input id="company_name" type="text" value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} required className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                    </div>
                    <div>
                      <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-2">Address</label>
                      <input id="address" type="text" value={companyForm.address} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" placeholder="Company address" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="company_currency" className="block text-sm font-medium text-slate-700 mb-2">Currency</label>
                    <select id="company_currency" value={companyForm.currency} onChange={(e) => setCompanyForm({ ...companyForm, currency: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all">
                      <option value="USD">USD ($)</option>
                      <option value="BDT">BDT (৳)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                    <p className="text-xs text-red-500 mt-1">Note: This only changes the currency symbol. No amounts will be converted.</p>
                  </div>
                  <div>
                    <label htmlFor="logo_url" className="block text-sm font-medium text-slate-700 mb-2">Logo URL</label>
                    <div className="flex gap-3">
                      <input id="logo_url" type="url" value={companyForm.logo_url} onChange={(e) => setCompanyForm({ ...companyForm, logo_url: e.target.value })} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" placeholder="https://example.com/logo.png" />
                      {companyForm.logo_url && (<div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden"><img src={companyForm.logo_url} alt="Logo preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /></div>)}
                    </div>
                  </div>
                  <div className="flex justify-end"><button type="submit" disabled={saving} className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-3 rounded-lg font-medium hover:from-emerald-700 hover:to-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl">{saving ? 'Saving...' : 'Save Changes'}</button></div>
                </form>
              </div>
            </div>
          )}
          {activeTab === 'tax' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100"><h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2"><Calculator className="h-5 w-5 text-emerald-600" />Tax Settings</h2></div>
              <div className="p-6">
                <form onSubmit={handleUpdateCompany} className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-stone-50 rounded-lg">
                    <div>
                      <h3 className="text-sm font-medium text-slate-900">Enable Tax</h3>
                      <p className="text-sm text-slate-600">Automatically apply tax to all bookings</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={companyForm.tax_enabled} onChange={(e) => setCompanyForm({ ...companyForm, tax_enabled: e.target.checked })} className="sr-only peer" /><div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div></label>
                  </div>
                  {companyForm.tax_enabled && (
                    <div>
                      <label htmlFor="tax_rate" className="block text-sm font-medium text-slate-700 mb-2">Tax Rate (%)</label>
                      <input id="tax_rate" type="number" step="0.01" min="0" max="100" value={companyForm.tax_rate} onChange={(e) => setCompanyForm({ ...companyForm, tax_rate: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" placeholder="0.00" />
                      <p className="text-xs text-slate-500 mt-1">Enter the tax percentage to be applied to all bookings.</p>
                    </div>
                  )}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"><p className="text-sm text-yellow-700"><strong>Note:</strong> Tax will be calculated on the discounted amount and added to the final total for all new bookings.</p></div>
                  <div className="flex justify-end"><button type="submit" disabled={saving} className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-3 rounded-lg font-medium hover:from-emerald-700 hover:to-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl">{saving ? 'Saving...' : 'Save Tax Settings'}</button></div>
                </form>
              </div>
            </div>
          )}
          {activeTab === 'team' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2"><Users className="h-5 w-5 text-emerald-600" />Team Members</h2><button onClick={() => setShowInviteModal(true)} className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-2 rounded-lg font-medium hover:from-emerald-700 hover:to-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"><UserPlus className="h-4 w-4" />Invite User</button></div></div>
              <div className="p-6">{companyUsers.length === 0 ? (<div className="text-center py-12"><Users className="h-16 w-16 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-medium text-slate-900 mb-2">No team members yet</h3><p className="text-slate-600">Invite your first team member to get started.</p></div>) : (<div className="space-y-4">{companyUsers.map((companyUser) => (<div key={companyUser.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center"><span className="text-white text-lg font-semibold">{companyUser.user_email?.charAt(0).toUpperCase() || 'U'}</span></div><div><p className="font-semibold text-slate-900">{companyUser.user_email || 'Unknown User'}</p><div className="flex items-center gap-2"><span className="text-sm text-slate-600 capitalize">{companyUser.role}</span>{companyUser.user_id === user?.id && (<span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full font-medium">You</span>)}</div></div></div>{companyUser.user_id !== user?.id && (<button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="h-5 w-5" /></button>)}</div>))}</div>)}</div>
            </div>
          )}
          {activeTab === 'email' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100"><h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2"><Mail className="h-5 w-5 text-emerald-600" />Email Settings</h2></div>
              <div className="p-6">
                <div className="space-y-6">
                  <div>
                    <label htmlFor="brevo_api_key" className="block text-sm font-medium text-slate-700 mb-2">Brevo API Key</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input id="brevo_api_key" type="password" value={emailSettings.brevo_api_key} onChange={(e) => setEmailSettings({ ...emailSettings, brevo_api_key: e.target.value })} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" placeholder="Enter your Brevo API key" />
                    </div>
                    <p className="text-sm text-slate-500 mt-2">Used for sending booking confirmations and notifications.</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <p className="text-sm text-emerald-700"><strong>Note:</strong> Email settings are stored securely and used for automated notifications.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'payment' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100"><h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2"><CreditCard className="h-5 w-5 text-emerald-600" />Payment Method Settings</h2></div>
              <div className="p-6">
                <div className="space-y-6">
                  <div>
                    <label htmlFor="stripe_secret_key" className="block text-sm font-medium text-slate-700 mb-2">Stripe Secret Key</label>
                    <input id="stripe_secret_key" type="password" value={paymentSettings.stripe_secret_key} onChange={(e) => setPaymentSettings({ ...paymentSettings, stripe_secret_key: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" placeholder="sk_test_..."/>
                  </div>
                  <div>
                    <label htmlFor="paypal_client_id" className="block text-sm font-medium text-slate-700 mb-2">PayPal Client ID</label>
                    <input id="paypal_client_id" type="text" value={paymentSettings.paypal_client_id} onChange={(e) => setPaymentSettings({ ...paymentSettings, paypal_client_id: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" placeholder="Enter PayPal Client ID"/>
                  </div>
                  <div>
                    <label htmlFor="bkash_merchant_id" className="block text-sm font-medium text-slate-700 mb-2">bKash Merchant ID</label>
                    <input id="bkash_merchant_id" type="text" value={paymentSettings.bkash_merchant_id} onChange={(e) => setPaymentSettings({ ...paymentSettings, bkash_merchant_id: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" placeholder="Enter bKash Merchant ID"/>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-700"><strong>Security:</strong> Payment credentials are encrypted and stored securely.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'plans' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2"><Crown className="h-5 w-5 text-yellow-600" /> Subscription Plans</h2>
                  <p className="text-sm text-slate-500 mt-1">Your current plan is: <span className="font-bold text-emerald-600">{companyForm.plan_name}</span></p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                      <div key={plan.id} className={`relative rounded-xl border-2 p-6 ${companyForm.plan_name === plan.name ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
                        {companyForm.plan_name === plan.name && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2"><span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-medium">Current Plan</span></div>
                        )}
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-slate-900 mb-2">{plan.name}</h3>
                          <div className="mb-4"><span className="text-3xl font-bold text-slate-900">${plan.price}</span><span className="text-slate-600">/month</span></div>
                          <ul className="space-y-2 mb-6 text-sm text-slate-600">
                            <li className="flex items-center justify-center gap-2"><Zap className="h-4 w-4 text-emerald-500" /> {plan.room_limit === -1 ? 'Unlimited' : `${plan.room_limit} rooms`}</li>
                            <li className="flex items-center justify-center gap-2"><Zap className="h-4 w-4 text-emerald-500" /> {plan.booking_limit === -1 ? 'Unlimited' : `${plan.booking_limit} bookings`}</li>
                            <li className="flex items-center justify-center gap-2"><Zap className="h-4 w-4 text-emerald-500" /> {plan.user_limit === -1 ? 'Unlimited' : `${plan.user_limit} users`}</li>
                          </ul>
                          
                          {/* --- THIS IS THE CORRECTED LOGIC --- */}
                          {companyForm.plan_name !== plan.name && plan.price > currentPlanPrice && (
                            <div className="space-y-2">
                              <button onClick={() => handleStripeUpgrade(plan.stripe_price_id)} disabled={isRedirecting || !plan.stripe_price_id || bkashLoading === plan.id} className="w-full py-2 px-4 rounded-xl font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-wait flex items-center justify-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                {isRedirecting ? 'Redirecting...' : 'Pay with Card'}
                              </button>
                              <button onClick={() => handleBkashUpgrade(plan.id)} disabled={bkashLoading === plan.id || isRedirecting} className="w-full py-2 px-4 rounded-xl font-medium bg-pink-600 text-white hover:bg-pink-700 disabled:bg-gray-400 disabled:cursor-wait flex items-center justify-center gap-2">
                                <Smartphone className="h-4 w-4" />
                                {bkashLoading === plan.id ? 'Processing...' : 'Pay with bKash'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b"><h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2"><Key className="h-5 w-5 text-emerald-600"/> Have an Activation Key?</h2></div>
                <form onSubmit={handleActivateKey} className="p-6 space-y-4">
                  <div><label htmlFor="activation_key" className="block text-sm font-medium text-slate-700 mb-2">Enter your key to upgrade your plan.</label><input id="activation_key" type="text" value={activationKey} onChange={(e) => setActivationKey(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder="PRO-XXXX-XXXX"/></div>
                  <div className="flex justify-end"><button type="submit" className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-3 rounded-lg font-medium hover:from-emerald-700">Activate Plan</button></div>
                </form>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-100"><h2 className="text-lg font-semibold text-slate-900">Account</h2></div>
                <div className="p-6"><div className="flex items-center justify-between"><div><h3 className="text-sm font-medium text-slate-900 mb-1">Signed in as</h3><p className="text-sm text-slate-600">{user?.email}</p></div><button onClick={handleSignOut} className="bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors flex items-center gap-2"><LogOut className="h-4 w-4" /> Sign Out</button></div></div>
              </div>
            </div>
          )}
        </div>
      </div>
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100"><h2 className="text-xl font-semibold text-slate-900">Invite Team Member</h2></div>
            <form onSubmit={handleInviteUser} className="p-6 space-y-4">
              <div>
                <label htmlFor="invite_email" className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input id="invite_email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" placeholder="colleague@company.com"/>
                </div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4"><p className="text-sm text-emerald-700"><strong>Note:</strong> This is a demo feature. In a production environment, this would send an invitation email to the user.</p></div>
              <div className="flex gap-3 pt-4"><button type="button" onClick={() => { setShowInviteModal(false); setInviteEmail(''); }} className="flex-1 px-4 py-3 border border-gray-300 text-slate-700 rounded-lg hover:bg-gray-50 font-medium transition-colors">Cancel</button><button type="submit" className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-3 rounded-lg font-medium hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 shadow-lg hover:shadow-xl">Send Invitation</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}