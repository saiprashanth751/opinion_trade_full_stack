import React, { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, Mail, Lock, User, TrendingUp, CheckCircle, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export default function AuthForms() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const router = useRouter();

  const showNotification = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const notification = { id, type, title, message };
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
    },
  });

  const onLoginSubmit = async (data: LoginForm) => {
    startTransition(async () => {
      try {
        const result = await signIn('login', {
          email: data.email,
          password: data.password,
          redirect: false,
        });

        if (result?.error) {
          if (result.error.includes('verify your email')) {
            showNotification('error', 'Email Verification Required', 'Please verify your email before signing in');
          } else {
            showNotification('error', 'Login Failed', 'Invalid email or password');
          }
        } else if (result?.ok) {
          showNotification('success', 'Welcome Back!', 'Successfully signed in to your account');
          setTimeout(() => {
            router.push('/events');
            router.refresh();
          }, 1500);
        }
      } catch (error) {
        console.error('Login error:', error);
        showNotification('error', 'Something Went Wrong', 'Please try again later');
      }
    });
  };

  const onRegisterSubmit = async (data: RegisterForm) => {
    startTransition(async () => {
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: data.email,
            password: data.password,
            name: data.name,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          showNotification('error', 'Registration Failed', result.error || 'Unable to create account');
          return;
        }

        if (result.success) {
          showNotification('success', 'Account Created!', 'Please check your email to verify your account');
          registerForm.reset();
          setTimeout(() => setIsLogin(true), 2000);
        } else {
          showNotification('error', 'Registration Failed', result.error || 'Unable to create account');
        }
      } catch (error) {
        console.error('Registration error:', error);
        showNotification('error', 'Something Went Wrong', 'Please try again later');
      }
    });
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginForm.handleSubmit(onLoginSubmit)();
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerForm.handleSubmit(onRegisterSubmit)();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        <AnimatePresence>
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 300, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 300, scale: 0.8 }}
              className={`bg-gradient-to-r backdrop-blur-sm border rounded-2xl p-4 shadow-2xl max-w-sm ${
                notification.type === 'success'
                  ? 'from-emerald-900/90 to-green-900/90 border-emerald-500/30'
                  : notification.type === 'error'
                  ? 'from-red-900/90 to-rose-900/90 border-red-500/30'
                  : 'from-blue-900/90 to-cyan-900/90 border-blue-500/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-1 rounded-full ${
                  notification.type === 'success' ? 'bg-emerald-500/20' :
                  notification.type === 'error' ? 'bg-red-500/20' : 'bg-blue-500/20'
                }`}>
                  {notification.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold text-sm">{notification.title}</h4>
                  <p className="text-slate-300 text-xs mt-1">{notification.message}</p>
                </div>
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-start">
        {/* Left Side - Decorative - Fixed height to prevent jumping */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="hidden lg:flex flex-col items-center justify-center space-y-8 min-h-[600px]"
        >
          <div className="relative">
            <div className="w-32 h-32 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-cyan-500/25">
              <TrendingUp className="w-16 h-16 text-white" />
            </div>
            <div className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full animate-bounce"></div>
            <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full animate-pulse"></div>
          </div>
          
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-cyan-200 to-blue-400 bg-clip-text text-transparent">
              PredictTrade
            </h1>
            <p className="text-xl text-slate-300 max-w-md">
              Turn your predictions into profits with our advanced trading platform
            </p>
            {/* <div className="flex items-center justify-center space-x-8 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400">₹10M+</div>
                <div className="text-sm text-slate-400">Total Traded</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400">50K+</div>
                <div className="text-sm text-slate-400">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-violet-400">95%</div>
                <div className="text-sm text-slate-400">Success Rate</div>
              </div>
            </div> */}
          </div>
        </motion.div>

        {/* Right Side - Auth Form - Fixed container height */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-md mx-auto"
        >
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
            <div className="relative bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-3xl shadow-2xl p-8 min-h-[600px] flex flex-col">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  {isLogin ? 'Welcome Back' : 'Join PredictTrade'}
                </h2>
                <p className="text-slate-400">
                  {isLogin 
                    ? 'Sign in to continue trading and earning' 
                    : 'Create your account and start earning from predictions'
                  }
                </p>
              </div>

              {/* Form Toggle */}
              <div className="flex bg-slate-800/50 rounded-2xl p-1 mb-8">
                <button
                  onClick={() => {
                    setIsLogin(true);
                    loginForm.reset();
                    registerForm.reset();
                  }}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                    isLogin
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setIsLogin(false);
                    loginForm.reset();
                    registerForm.reset();
                  }}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                    !isLogin
                      ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/25'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Forms Container - Fixed height with overflow handling */}
              <div className="flex-1 min-h-[320px]">
                <AnimatePresence mode="wait">
                  {isLogin ? (
                    <motion.form
                      key="login"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      onSubmit={handleLoginSubmit}
                      className="space-y-6 h-full"
                    >
                      <div>
                        <label className="block text-slate-300 text-sm font-medium mb-3">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                          <input
                            type="email"
                            placeholder="Enter your email"
                            className="w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder:text-slate-400 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all duration-200"
                            {...loginForm.register('email')}
                          />
                        </div>
                        {loginForm.formState.errors.email && (
                          <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {loginForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-slate-300 text-sm font-medium mb-3">Password</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter your password"
                            className="w-full pl-12 pr-12 py-4 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder:text-slate-400 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 focus:outline-none transition-all duration-200"
                            {...loginForm.register('password')}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                        {loginForm.formState.errors.password && (
                          <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {loginForm.formState.errors.password.message}
                          </p>
                        )}
                      </div>

                      <div className="pt-4">
                        <button 
                          type="submit"
                          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white py-4 px-4 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 shadow-lg shadow-cyan-500/25"
                          disabled={isPending}
                        >
                          {isPending ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Signing in...
                            </>
                          ) : (
                            'Sign In to Your Account'
                          )}
                        </button>
                      </div>
                    </motion.form>
                  ) : (
                    <motion.form
                      key="register"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      onSubmit={handleRegisterSubmit}
                      className="space-y-6 h-full"
                    >
                      <div>
                        <label className="block text-slate-300 text-sm font-medium mb-3">Full Name (Optional)</label>
                        <div className="relative">
                          <User className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Enter your full name"
                            className="w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder:text-slate-400 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all duration-200"
                            {...registerForm.register('name')}
                          />
                        </div>
                        {registerForm.formState.errors.name && (
                          <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {registerForm.formState.errors.name.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-slate-300 text-sm font-medium mb-3">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                          <input
                            type="email"
                            placeholder="Enter your email"
                            className="w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder:text-slate-400 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all duration-200"
                            {...registerForm.register('email')}
                          />
                        </div>
                        {registerForm.formState.errors.email && (
                          <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {registerForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-slate-300 text-sm font-medium mb-3">Password</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Create a strong password"
                            className="w-full pl-12 pr-12 py-4 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder:text-slate-400 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all duration-200"
                            {...registerForm.register('password')}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                        {registerForm.formState.errors.password && (
                          <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {registerForm.formState.errors.password.message}
                          </p>
                        )}
                      </div>

                      <div className="pt-4">
                        <button 
                          type="submit"
                          className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white py-4 px-4 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 shadow-lg shadow-emerald-500/25"
                          disabled={isPending}
                        >
                          {isPending ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Creating account...
                            </>
                          ) : (
                            'Create Your Account'
                          )}
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="text-center mt-6">
                <p className="text-xs text-slate-500">
                  By continuing, you accept that you are 18+ years of age & agree to our{' '}
                  <a href="#" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                    Terms and Conditions
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                    Privacy Policy
                  </a>
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}