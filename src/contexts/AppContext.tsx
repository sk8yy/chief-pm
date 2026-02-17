import React, { createContext, useContext, useState, useEffect } from 'react';

export type PanelType = 'sticker' | 'discipline' | 'personal' | 'project';
export type ModeType = 'plan' | 'record';

interface AppContextType {
  activePanel: PanelType;
  setActivePanel: (p: PanelType) => void;
  mode: ModeType;
  setMode: (m: ModeType) => void;
  currentUserId: string | null;
  setCurrentUserId: (id: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePanel, setActivePanel] = useState<PanelType>('sticker');
  const [mode, setMode] = useState<ModeType>('plan');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'record') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [mode]);

  return (
    <AppContext.Provider value={{ activePanel, setActivePanel, mode, setMode, currentUserId, setCurrentUserId }}>
      {children}
    </AppContext.Provider>
  );
};

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
