import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, Activity } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function AuthGuard({ 
  children, 
  requireAuth = true, 
  redirectTo = '/auth/signin' 
}: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (requireAuth && status === 'unauthenticated') {
      router.push(redirectTo);
      return;
    }

    if (!requireAuth && status === 'authenticated') {
      router.push('/events');
      return;
    }
  }, [status, session, router, requireAuth, redirectTo]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex justify-center items-center">
        <div className="text-center">
          <div className="inline-flex items-center gap-3 text-xl font-semibold text-white">
            <Activity className="w-6 h-6 animate-pulse text-cyan-400" />
            Loading...
          </div>
        </div>
      </div>
    );
  }

  if (requireAuth && status === 'unauthenticated') {
    return null; // Will redirect
  }

  if (!requireAuth && status === 'authenticated') {
    return null; // Will redirect
  }

  return <>{children}</>;
}