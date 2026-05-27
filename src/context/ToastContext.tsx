import { createContext, useContext } from 'react';
import { useToast } from '../hooks/useToast';

export const ToastContext = createContext<ReturnType<typeof useToast> | null>(null);

export function useAppToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useAppToast must be used within ToastContext.Provider');
  }
  return context;
}
