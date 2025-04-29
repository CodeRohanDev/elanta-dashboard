import { ReactNode, useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { userData, loading } = useAuth();
  const router = useRouter();

  // Use useEffect for navigation instead of during render
  useEffect(() => {
    if (!loading) {
      if (!userData) {
        // Redirect to login if not authenticated
        router.push('/login');
      } else if (userData.role !== 'admin') {
        // Redirect non-admin users
        router.push('/access-denied');
      }
    }
  }, [loading, userData, router]);

  // Return loading state or null while checking auth
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
      </div>
    );
  }

  // Don't render dashboard for non-admins
  if (!userData || userData.role !== 'admin') {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        userRole={userData.role} 
      />

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
          user={userData} 
        />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-secondary/20 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
} 