import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../hooks/useAuth'; // Import useAuth

export function StripeSuccessHandler() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const { refreshCompany } = useAuth(); // Get the refresh function

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (!sessionId) {
      setStatus('error');
      setMessage('No session ID found in URL. Cannot confirm subscription status.');
      return;
    }

    // Give the webhook time to process, then refresh data and redirect.
    const timer = setTimeout(async () => {
      await refreshCompany(); // This is the crucial line
      
      setStatus('success');
      setMessage('Your subscription has been activated successfully!');
      
      setTimeout(() => {
        navigate('/settings', { state: { tab: 'plans' } });
      }, 3000);
      
    }, 3000); // Wait 3 seconds for the webhook to be safe

    return () => clearTimeout(timer);
  }, [searchParams, navigate, refreshCompany]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Finalizing Payment</h1>
            <p className="text-slate-600">Please wait while we confirm your subscription...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h1>
            <p className="text-slate-600 mb-4">{message}</p>
            <p className="text-sm text-slate-500">Redirecting you to your settings...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h1>
            <p className="text-slate-600 mb-4">{message}</p>
            <button
              onClick={() => navigate('/settings', { state: { tab: 'plans' } })}
              className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Go to Settings
            </button>
          </>
        )}
      </div>
    </div>
  );
}