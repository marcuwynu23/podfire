"use client";

import { createContext, useContext, useState, useCallback } from "react";

type DashboardMobileContextValue = {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
};

const DashboardMobileContext = createContext<DashboardMobileContextValue | null>(null);

export function DashboardMobileProvider({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const setter = useCallback((open: boolean) => setMobileMenuOpen(open), []);
  return (
    <DashboardMobileContext.Provider value={{ mobileMenuOpen, setMobileMenuOpen: setter }}>
      {children}
    </DashboardMobileContext.Provider>
  );
}

export function useDashboardMobile() {
  const ctx = useContext(DashboardMobileContext);
  return ctx ?? { mobileMenuOpen: false, setMobileMenuOpen: () => {} };
}
