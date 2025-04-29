'use client';

import Link from 'next/link';
import { RiShieldCrossLine, RiArrowLeftLine } from 'react-icons/ri';
import { useAuth } from '@/contexts/AuthContext';

export default function AccessDenied() {
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-destructive/20">
          <RiShieldCrossLine className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Access Denied</h1>
        <p className="text-lg text-muted-foreground">
          This dashboard is only accessible to administrators.
        </p>
        <div className="mt-6 flex flex-col space-y-4">
          <Link 
            href="/login" 
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            onClick={handleLogout}
          >
            <RiArrowLeftLine className="mr-2 h-5 w-5" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
} 