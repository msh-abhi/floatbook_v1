import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export function BkashCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshCompany } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const paymentID = searchParams.get('paymentID');
    const paymentStatus = searchParams.get('status');
    
    if (!paymentID) {
      setStatus('error');
      setMessage('No payment ID found in URL');
      return;
    }

    if (paymentStatus !== 'success') {
      setStatus('error');
      setMessage('Payment was not successful. Please try again.');
      return;
    }

    verifyPayment(paymentID);
  }, [searchParams]);

  const verifyPayment = async (paymentID: string) => {
    try {
      setStatus('loading');
      setMessage('Verifying your payment, please wait...');

      const { data, error } = await supabase.functions.invoke('verify-bkash-payment', {
        body: { paymentID },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        setStatus('success');
        setMessage(data.message);
        
        // Refresh company data to update plan
        await refreshCompany();
        
        // Redirect to settings after 3 seconds
        setTimeout(() => {
          navigate('/settings', { state: { tab: 'plans' } });
        }, 3000);
      } else {
        setStatus('error');
        setMessage(data.message || 'Payment verification failed');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setStatus('error');
      setMessage('Failed to verify payment. Please contact support.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Verifying Payment</h1>
            <p className="text-slate-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h1>
            <p className="text-slate-600 mb-4">{message}</p>
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <CreditCard className="h-4 w-4" />
              <span>Paid via bKash</span>
            </div>
            <p className="text-sm text-slate-500 mt-4">Redirecting you to settings...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Failed</h1>
            <p className="text-slate-600 mb-4">{message}</p>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/settings', { state: { tab: 'plans' } })}
                className="w-full bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-gray-200 text-slate-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}