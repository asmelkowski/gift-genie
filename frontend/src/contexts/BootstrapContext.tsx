import { createContext, useContext } from 'react';

interface BootstrapContextType {
  isBootstrapping: boolean;
}

export const BootstrapContext = createContext<BootstrapContextType | undefined>(undefined);

export function useBootstrap() {
  const context = useContext(BootstrapContext);
  if (context === undefined) {
    throw new Error('useBootstrap must be used within a BootstrapContext.Provider');
  }
  return context;
}
