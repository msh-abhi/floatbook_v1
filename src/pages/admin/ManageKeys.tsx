import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plan } from '../../types'; // We already have this from the last step
import { Key, Plus, CheckCircle, XCircle, Copy } from 'lucide-react';

interface ActivationKey {
  id: string;
  key: string;
  plan_id: string;
  is_used: boolean;
  used_by_company_id?: string;
  plans: { name: string }; // For displaying the plan name
}

export function ManageKeys() {
  const [keys, setKeys] = useState<ActivationKey[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch plans for the dropdown
      const { data: plansData, error: plansError } = await supabase.from('plans').select('*').neq('name', 'Free');
      if (plansError) throw plansError;
      // @ts-ignore
      setPlans(plansData || []);
      if (plansData && plansData.length > 0) {
        setSelectedPlanId(plansData[0].id);
      }

      // Fetch existing keys with their plan name
      const { data: keysData, error: keysError } = await supabase.from('activation_keys').select(`*, plans(name)`).order('created_at', { ascending: false });
      if (keysError) throw keysError;
      // @ts-ignore
      setKeys(keysData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRandomKey = () => {
    const prefix = plans.find(p => p.id === selectedPlanId)?.name.toUpperCase().substring(0, 3) || 'KEY';
    const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `${prefix}-${randomPart}`;
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) {
      alert('Please select a plan.');
      return;
    }

    const newKey = generateRandomKey();
    const { data, error } = await supabase.from('activation_keys').insert({ key: newKey, plan_id: selectedPlanId }).select().single();
    if (error) {
      alert('Error generating key: ' + error.message);
    } else {
      setGeneratedKey(newKey); // Show the new key to the admin
      fetchData(); // Refresh the list
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Key copied to clipboard!');
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Manage Activation Keys</h1>
      </div>

      {/* Key Generation Form */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Generate New Key</h2>
        <form onSubmit={handleGenerateKey} className="flex items-end gap-4">
          <div className="flex-1">
            <label htmlFor="plan" className="block text-sm font-medium text-slate-700 mb-1">Select Plan</label>
            <select id="plan" value={selectedPlanId} onChange={e => setSelectedPlanId(e.target.value)} className="w-full p-2 border rounded-lg bg-gray-50">
              {plans.map(plan => (
                <option key={plan.id} value={plan.id}>{plan.name} - ${plan.price}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 h-10">
            <Plus className="h-5 w-5" /> Generate Key
          </button>
        </form>
        {generatedKey && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
            <p className="text-emerald-800">New key: <span className="font-mono font-bold">{generatedKey}</span></p>
            <button onClick={() => copyToClipboard(generatedKey)} className="p-2 text-slate-500 hover:text-emerald-700"><Copy className="h-4 w-4" /></button>
          </div>
        )}
      </div>
      
      {/* List of Existing Keys */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-4 text-sm font-semibold text-slate-600">Activation Key</th>
              <th className="p-4 text-sm font-semibold text-slate-600">Plan</th>
              <th className="p-4 text-sm font-semibold text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {keys.map(k => (
              <tr key={k.id} className="border-b last:border-b-0 hover:bg-gray-50">
                <td className="p-4 font-mono">{k.key}</td>
                <td className="p-4">{k.plans.name}</td>
                <td className="p-4">
                  {k.is_used ? (
                    <span className="flex items-center gap-2 text-red-600">
                      <XCircle className="h-4 w-4" /> Used
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle className="h-4 w-4" /> Available
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}