import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plan } from '../../types'; // Assuming you'll add 'Plan' to your types
import { Edit, Plus, Trash2 } from 'lucide-react';

export function ManagePlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const initialFormData = { name: '', price: 0, room_limit: 0, booking_limit: 0, user_limit: 0, stripe_price_id: '' };
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('plans').select('*').order('price');
      if (error) throw error;
      // @ts-ignore
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({ ...plan });
    setShowModal(true);
  };

  const handleAddNewClick = () => {
    setEditingPlan(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  const handleDelete = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    const { error } = await supabase.from('plans').delete().eq('id', planId);
    if (error) {
      alert('Error deleting plan: ' + error.message);
    } else {
      fetchPlans();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = editingPlan
      ? await supabase.from('plans').update(formData).eq('id', editingPlan.id)
      : await supabase.from('plans').insert([formData]);

    if (error) {
      alert('Error saving plan: ' + error.message);
    } else {
      setShowModal(false);
      fetchPlans();
    }
  };
  
  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Manage Subscription Plans</h1>
        <button onClick={handleAddNewClick} className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus className="h-5 w-5" /> Add New Plan
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-4 text-sm font-semibold text-slate-600">Plan Name</th>
              <th className="p-4 text-sm font-semibold text-slate-600">Price</th>
              <th className="p-4 text-sm font-semibold text-slate-600">Limits</th>
              <th className="p-4 text-sm font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.map(plan => (
              <tr key={plan.id} className="border-b last:border-b-0 hover:bg-gray-50">
                <td className="p-4 font-semibold">{plan.name}</td>
                <td className="p-4">${plan.price}/month</td>
                <td className="p-4 text-sm text-slate-600">
                  {plan.room_limit === -1 ? 'Unlimited' : plan.room_limit} Rooms | {' '}
                  {plan.booking_limit === -1 ? 'Unlimited' : plan.booking_limit} Bookings | {' '}
                  {plan.user_limit === -1 ? 'Unlimited' : plan.user_limit} Users
                </td>
                <td className="p-4">
                  <button onClick={() => handleEditClick(plan)} className="p-2 text-slate-400 hover:text-emerald-600 rounded-lg"><Edit className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(plan.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b"><h2 className="text-xl font-semibold">{editingPlan ? 'Edit Plan' : 'Create New Plan'}</h2></div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <input type="text" placeholder="Plan Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded" required />
              <input type="number" placeholder="Price" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className="w-full p-2 border rounded" required />
              <input type="number" placeholder="Room Limit (-1 for unlimited)" value={formData.room_limit} onChange={e => setFormData({...formData, room_limit: parseInt(e.target.value)})} className="w-full p-2 border rounded" required />
              <input type="number" placeholder="Booking Limit (-1 for unlimited)" value={formData.booking_limit} onChange={e => setFormData({...formData, booking_limit: parseInt(e.target.value)})} className="w-full p-2 border rounded" required />
              <input type="number" placeholder="User Limit (-1 for unlimited)" value={formData.user_limit} onChange={e => setFormData({...formData, user_limit: parseInt(e.target.value)})} className="w-full p-2 border rounded" required />
              <input type="text" placeholder="Stripe Price ID (optional)" value={formData.stripe_price_id} onChange={e => setFormData({...formData, stripe_price_id: e.target.value})} className="w-full p-2 border rounded" />
              <div className="flex gap-3 pt-4 border-t">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-3 border rounded-lg">Cancel</button>
                  <button type="submit" className="flex-1 bg-emerald-600 text-white rounded-lg">Save Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}