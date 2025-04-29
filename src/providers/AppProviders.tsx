'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from './ThemeProvider';
import { InventoryProvider } from '@/contexts/InventoryContext';
import { NavigationProvider } from '@/contexts/NavigationContext';
import LoadingOverlay from '@/components/navigation/LoadingOverlay';

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationProvider>
          <InventoryProvider>
            <>
              <LoadingOverlay />
              {children}
            </>
          </InventoryProvider>
        </NavigationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
} 