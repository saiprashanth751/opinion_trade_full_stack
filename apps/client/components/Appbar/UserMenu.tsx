import React, { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  BarChart3, 
  Settings, 
  LogOut, 
  ChevronDown,
  Wallet,
  TrendingUp,
  Home,
  Activity
} from 'lucide-react';
import { getUserBalance } from '@/actions/User/getBalance';

export default function UserMenu() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [balance, setBalance] = useState(null);
  const menuRef = useRef(null);
  const router = useRouter();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


useEffect(() => {
  const fetchBalance = async () => {
    if (session?.user?.id) {
      const result = await getUserBalance();
      if (result.success) {
        setBalance(result.balance);
      }
    }
  };
  fetchBalance();
}, [session]);

  if (!session?.user) return null;

  // Get user initials
  const getInitials = (name, email) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const handleNavigation = (path) => {
    router.push(path);
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
    setIsOpen(false);
  };

  const menuItems = [
    {
      icon: Home,
      label: 'Events',
      onClick: () => handleNavigation('/events'),
      gradient: 'from-violet-500 to-purple-600',
      description: 'Browse trading events'
    },
    {
      icon: BarChart3,
      label: 'Portfolio',
      onClick: () => handleNavigation('/dashboard'),
      gradient: 'from-emerald-500 to-green-600',
      description: 'View your positions'
    },
    {
      icon: Settings,
      label: 'Profile',
      onClick: () => handleNavigation('/profile'),
      gradient: 'from-blue-500 to-cyan-600',
      description: 'Account settings'
    }
  ];

  return (
    <div className="fixed top-6 right-6 z-50" ref={menuRef}>
      {/* User Avatar Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="relative group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Glowing background effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-300"></div>
        
        {/* Avatar circle */}
        <div className="relative w-14 h-14 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-2xl border-2 border-white/20">
          {getInitials(session.user.name, session.user.email)}
        </div>
        
        {/* Dropdown indicator */}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-slate-700 to-slate-800 rounded-full flex items-center justify-center border-2 border-slate-600 shadow-lg"
        >
          <ChevronDown className="w-2.5 h-2.5 text-slate-300" />
        </motion.div>

        {/* Online indicator */}
        <div className="absolute -top-1 -left-1 w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-20 right-0 w-80 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* User Info Header */}
            <div className="px-6 py-5 border-b border-slate-700/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {getInitials(session.user.name, session.user.email)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-base truncate">
                    {session.user.name || 'User'}
                  </p>
                  <p className="text-slate-400 text-sm truncate">
                    {session.user.email}
                  </p>
                </div>
              </div>
              
              {/* Balance Display */}
              {balance !== null && (
                <div className="mt-4 p-3 bg-gradient-to-r from-emerald-900/30 to-green-900/30 rounded-lg border border-emerald-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300 text-sm font-medium">Balance</span>
                    </div>
                    <span className="text-white font-bold text-lg">₹{balance.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Menu Items */}
            <div className="px-3 py-3">
              {menuItems.map((item, index) => (
                <motion.button
                  key={item.label}
                  onClick={item.onClick}
                  className="w-full group relative overflow-hidden"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {/* Hover background effect */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-10 transition-all duration-300 rounded-xl`} />
                  
                  <div className="relative flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-800/50 transition-all duration-200">
                    <div className={`p-2 bg-gradient-to-r ${item.gradient} bg-opacity-20 rounded-lg`}>
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-semibold text-sm">{item.label}</p>
                      <p className="text-slate-400 text-xs">{item.description}</p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full" />
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Sign Out Section */}
            <div className="px-3 pb-3 border-t border-slate-700/50 pt-3">
              <motion.button
                onClick={handleSignOut}
                className="w-full group relative overflow-hidden"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Hover background effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-rose-600 opacity-0 group-hover:opacity-10 transition-all duration-300 rounded-xl" />
                
                <div className="relative flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-800/50 transition-all duration-200">
                  <div className="p-2 bg-gradient-to-r from-red-500 to-rose-600 bg-opacity-20 rounded-lg">
                    <LogOut className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-red-400 font-semibold text-sm">Sign Out</p>
                    <p className="text-slate-500 text-xs">End your session</p>
                  </div>
                </div>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}