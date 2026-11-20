'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { GenderTheme, OccasionTheme } from '@/types';
import { supabase } from '@/lib/supabase';

type Theme = 'dark' | 'light';
type FontSize = 'sm' | 'normal' | 'lg';

interface ThemeContextType {
  theme: Theme;
  gender: GenderTheme;
  occasionTheme: OccasionTheme;
  fontSize: FontSize;
  dataSaverMode: boolean;
  showGenderModal: boolean;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  toggleGender: () => void;
  setGender: (g: GenderTheme) => void;
  setFontSize: (s: FontSize) => void;
  toggleDataSaverMode: () => void;
  closeGenderModal: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  gender: 'blue',
  occasionTheme: 'default',
  fontSize: 'normal',
  dataSaverMode: false,
  showGenderModal: false,
  toggleTheme: () => {},
  setTheme: () => {},
  toggleGender: () => {},
  setGender: () => {},
  setFontSize: () => {},
  toggleDataSaverMode: () => {},
  closeGenderModal: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [gender, setGenderState] = useState<GenderTheme>('blue');
  const [occasionTheme, setOccasionThemeState] = useState<OccasionTheme>('default');
  const [fontSize, setFontSizeState] = useState<FontSize>('normal');
  const [dataSaverMode, setDataSaverMode] = useState<boolean>(false);
  const [showGenderModal, setShowGenderModal] = useState<boolean>(false);

  const applyTheme = useCallback((t: Theme) => {
    const root = document.documentElement;
    if (t === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  const applyGender = useCallback((g: GenderTheme) => {
    const root = document.documentElement;
    root.setAttribute('data-gender', g);
  }, []);

  const applyOccasionTheme = useCallback((ot: OccasionTheme) => {
    const root = document.documentElement;
    root.setAttribute('data-occasion-theme', ot || 'default');
  }, []);

  const applyFontSize = useCallback((s: FontSize) => {
    const root = document.documentElement;
    root.setAttribute('data-font-size', s);
  }, []);

  useEffect(() => {
    // 1. Theme initialization
    const savedTheme = localStorage.getItem('eldostour_theme') as Theme | null;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setThemeState(savedTheme);
      applyTheme(savedTheme);
    } else {
      setThemeState('dark');
      applyTheme('dark');
    }

    // 2. Gender theme initialization
    const savedGender = localStorage.getItem('eldostour_gender') as GenderTheme | null;
    if (savedGender === 'blue' || savedGender === 'burgundy') {
      setGenderState(savedGender);
      applyGender(savedGender);
    } else {
      // First time student visit: prompt to choose
      setShowGenderModal(true);
      applyGender('blue');
    }

    // 3. Font Size initialization
    const savedFont = localStorage.getItem('eldostour_fontsize') as FontSize | null;
    if (savedFont) {
      setFontSizeState(savedFont);
      applyFontSize(savedFont);
    }

    // 4. Data Saver Mode initialization
    const savedDataSaver = localStorage.getItem('eldostour_data_saver');
    if (savedDataSaver === 'true') {
      setDataSaverMode(true);
    }

    // 5. Fetch & Realtime Sync for Occasion Theme
    const fetchOccasionTheme = async () => {
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'general')
          .single();

        if (data?.value?.active_occasion_theme) {
          const ot = data.value.active_occasion_theme as OccasionTheme;
          setOccasionThemeState(ot);
          applyOccasionTheme(ot);
        }
      } catch {
        // ignore
      }
    };

    fetchOccasionTheme();

    const channel = supabase
      .channel('realtime_theme_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_settings', filter: 'key=eq.general' },
        (payload: any) => {
          if (payload?.new?.value?.active_occasion_theme) {
            const ot = payload.new.value.active_occasion_theme as OccasionTheme;
            setOccasionThemeState(ot);
            applyOccasionTheme(ot);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [applyTheme, applyGender, applyFontSize, applyOccasionTheme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('eldostour_theme', t);
    applyTheme(t);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  const setGender = (g: GenderTheme) => {
    setGenderState(g);
    localStorage.setItem('eldostour_gender', g);
    applyGender(g);
  };

  const toggleGender = () => {
    const next: GenderTheme = gender === 'blue' ? 'burgundy' : 'blue';
    setGender(next);
  };

  const setFontSize = (s: FontSize) => {
    setFontSizeState(s);
    localStorage.setItem('eldostour_fontsize', s);
    applyFontSize(s);
  };

  const toggleDataSaverMode = () => {
    setDataSaverMode((prev) => {
      const next = !prev;
      localStorage.setItem('eldostour_data_saver', String(next));
      return next;
    });
  };

  const closeGenderModal = () => {
    setShowGenderModal(false);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        gender,
        occasionTheme,
        fontSize,
        dataSaverMode,
        showGenderModal,
        toggleTheme,
        setTheme,
        toggleGender,
        setGender,
        setFontSize,
        toggleDataSaverMode,
        closeGenderModal,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
