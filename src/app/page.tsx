'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Image from "next/image";

export default function Home() {
  const { userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (userData) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [userData, loading, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-t-2 border-blue-600"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </main>
  );
}
