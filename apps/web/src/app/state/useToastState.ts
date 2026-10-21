import { useState } from 'react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
}

export function useToastState() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = (id: string) => {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== id),
    );
  };

  const showToast = (
    type: ToastMessage['type'],
    title: string,
    message?: string,
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((currentToasts) => [
      ...currentToasts,
      { id, type, title, message },
    ]);
    setTimeout(() => dismissToast(id), 4500);
  };

  return { toasts, showToast, dismissToast };
}
