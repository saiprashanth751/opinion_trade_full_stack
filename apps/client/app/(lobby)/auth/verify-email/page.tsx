'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, TrendingUp, Mail, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(3);
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const result = await response.json();

        if (result.success) {
          setStatus('success');
          setMessage('Your email has been verified successfully!');
          
          // Countdown and redirect to sign in page
          const countdownInterval = setInterval(() => {
            setCountdown(prev => {
              if (prev <= 1) {
                clearInterval(countdownInterval);
                router.push('/auth/signin');
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          setStatus('error');
          setMessage(result.error || 'Email verification failed');
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      }
    };

    verifyEmail();
  }, [token, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
          <div className="relative bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-3xl shadow-2xl p-8">
            
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">PredictTrade</h1>
              <p className="text-slate-400">Email Verification</p>
            </div>

            {/* Content */}
            <div className="text-center space-y-6">
              {status === 'loading' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <div className="relative">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full flex items-center justify-center border border-blue-500/30">
                      <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full animate-bounce"></div>
                  </div>
                  
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2">Verifying Your Email</h2>
                    <p className="text-slate-300">Please wait while we verify your email address...</p>
                  </div>
                </motion.div>
              )}

              {status === 'success' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-6"
                >
                  <div className="relative">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-full flex items-center justify-center border border-emerald-500/30">
                      <CheckCircle className="w-10 h-10 text-emerald-400" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full"></div>
                    <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full animate-pulse"></div>
                  </div>
                  
                  <div>
                    <h2 className="text-xl font-bold text-emerald-400 mb-2">Email Verified Successfully!</h2>
                    <p className="text-slate-300 mb-4">{message}</p>
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                      <p className="text-sm text-slate-400 mb-2">Redirecting to sign in page in</p>
                      <div className="text-2xl font-bold text-emerald-400">{countdown}s</div>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push('/auth/signin')}
                    className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white py-4 px-4 rounded-xl font-semibold flex items-center justify-center transition-all duration-200 shadow-lg shadow-emerald-500/25"
                  >
                    <Mail className="w-5 h-5 mr-2" />
                    Go to Sign In
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </button>
                </motion.div>
              )}

              {status === 'error' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-6"
                >
                  <div className="relative">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-r from-red-500/20 to-rose-500/20 rounded-full flex items-center justify-center border border-red-500/30">
                      <XCircle className="w-10 h-10 text-red-400" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-red-500 to-rose-600 rounded-full"></div>
                  </div>
                  
                  <div>
                    <h2 className="text-xl font-bold text-red-400 mb-2">Verification Failed</h2>
                    <p className="text-slate-300 mb-6">{message}</p>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => router.push('/auth/signin')}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white py-4 px-4 rounded-xl font-semibold flex items-center justify-center transition-all duration-200 shadow-lg shadow-cyan-500/25"
                    >
                      <Mail className="w-5 h-5 mr-2" />
                      Go to Sign In
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </button>
                    
                    <button
                      onClick={() => window.location.reload()}
                      className="w-full bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white py-4 px-4 rounded-xl font-semibold border border-slate-600/50 hover:border-slate-500/50 transition-all duration-200"
                    >
                      <Loader2 className="w-5 h-5 mr-2" />
                      Try Again
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center mt-8 pt-6 border-t border-slate-700/50">
              <p className="text-xs text-slate-500">
                Need help?{' '}
                <a href="#" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                  Contact Support
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}