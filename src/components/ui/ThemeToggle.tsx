'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { RiSunLine, RiMoonLine, RiComputerLine } from 'react-icons/ri';

type Theme = 'light' | 'dark' | 'system';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Avoid hydration mismatch by rendering only after component is mounted
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) return null;
  
  const themes: Theme[] = ['light', 'dark', 'system'];
  
  const themeIcons = {
    light: <RiSunLine className="h-5 w-5" />,
    dark: <RiMoonLine className="h-5 w-5" />,
    system: <RiComputerLine className="h-5 w-5" />
  };

  return (
    <div className="flex items-center rounded-md bg-secondary p-1">
      {themes.map((t) => (
        <button
          key={t}
          onClick={() => setTheme(t)}
          className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
            theme === t 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:bg-background/30'
          }`}
          title={`Switch to ${t} theme`}
        >
          {themeIcons[t]}
        </button>
      ))}
    </div>
  );
} 