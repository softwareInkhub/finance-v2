import React, { createContext, useContext, useState, ReactNode } from 'react';

export type TabType = 'overview' | 'accounts' | 'statements' | 'super-bank' | string;

export interface Tab {
  key: string;
  label: string;
  type: TabType;
  bankId?: string;
  accountId?: string;
  accountName?: string;
  href?: string; // for navigation
}

interface TabBarContextType {
  tabs: Tab[];
  activeTab: string;
  addTab: (tab: Tab) => void;
  closeTab: (tabKey: string) => void;
  setActiveTab: (tabKey: string) => void;
}

const TabBarContext = createContext<TabBarContextType | undefined>(undefined);

export function useTabBar() {
  const ctx = useContext(TabBarContext);
  if (!ctx) throw new Error('useTabBar must be used within a TabBarProvider');
  return ctx;
}

export function TabBarProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([
    { key: 'overview', label: 'Overview', type: 'overview', href: '/banks' },
  ]);
  const [activeTab, setActiveTab] = useState('overview');

  const addTab = (tab: Tab) => {
    setTabs((prev) => {
      if (prev.some((t) => t.key === tab.key)) return prev;
      return [...prev, tab];
    });
    setActiveTab(tab.key);
  };

  const closeTab = (tabKey: string) => {
    setTabs((prev) => {
      const filtered = prev.filter((t) => t.key !== tabKey);
      if (activeTab === tabKey) {
        setActiveTab(filtered.length > 0 ? filtered[filtered.length - 1].key : 'overview');
      }
      return filtered;
    });
  };

  return (
    <TabBarContext.Provider value={{ tabs, activeTab, addTab, closeTab, setActiveTab }}>
      {children}
    </TabBarContext.Provider>
  );
} 