'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface NavigationContextProps {
  isPageLoading: boolean;
}

const NavigationContext = createContext<NavigationContextProps>({
  isPageLoading: false,
});

export const useNavigation = () => useContext(NavigationContext);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [isPageLoading, setIsPageLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track navigation changes
  useEffect(() => {
    setIsPageLoading(true);
    
    // Add a slight delay to simulate loading and ensure animation is visible
    const timeout = setTimeout(() => {
      setIsPageLoading(false);
    }, 500);
    
    return () => {
      clearTimeout(timeout);
    };
  }, [pathname, searchParams]);

  return (
    <NavigationContext.Provider value={{ isPageLoading }}>
      {children}
    </NavigationContext.Provider>
  );
} 