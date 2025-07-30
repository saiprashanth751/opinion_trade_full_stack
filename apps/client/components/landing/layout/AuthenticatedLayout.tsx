// components/layout/AuthenticatedLayout.tsx
"use client";

import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import UserMenu from '@/components/Appbar/UserMenu';
import { Loader2 } from 'lucide-react';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
  showUserMenu?: boolean;
}

export default function AuthenticatedLayout({ 
  children, 
  showUserMenu = true 
}: AuthenticatedLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex justify-center items-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-4" />
          <div className="text-xl font-semibold text-white">Loading...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect to signin
  }

  return (
    <div className="relative min-h-screen">
      {showUserMenu && <UserMenu />}
      {children}
    </div>
  );
}