'use client';

import { useNavigation } from '@/contexts/NavigationContext';
import { useState, useEffect } from 'react';

export default function LoadingOverlay() {
  const { isPageLoading } = useNavigation();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPageLoading) {
      // Reset progress
      setProgress(0);
      
      // Animate progress to create a more natural loading effect
      interval = setInterval(() => {
        setProgress((prevProgress) => {
          // Slow down as it approaches 90%
          const increment = Math.max(1, 10 - Math.floor(prevProgress / 10));
          const nextProgress = prevProgress + increment;
          return nextProgress >= 90 ? 90 : nextProgress;
        });
      }, 100);
    } else if (progress > 0) {
      // Quickly complete the progress bar when loading is done
      setProgress(100);
      
      // Reset after animation completes
      const timeout = setTimeout(() => {
        setProgress(0);
      }, 500);
      
      return () => clearTimeout(timeout);
    }
    
    return () => clearInterval(interval);
  }, [isPageLoading, progress]);

  return (
    <>
      {/* Top progress bar */}
      {progress > 0 && (
        <div className="fixed top-0 left-0 z-50 w-full h-1 bg-background">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      
      {/* Full screen overlay (only shows when loading takes longer) */}
      {isPageLoading && progress > 60 && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/50 backdrop-blur-sm transition-opacity duration-300">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      )}
    </>
  );
} 