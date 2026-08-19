import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useApp();

  return (
    <div
      id="toast-notifications-container"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          let icon = <Info className="w-5 h-5 text-blue-600 shrink-0" />;
          let borderClass = 'border-blue-200 bg-white';
          if (toast.type === 'success') {
            icon = (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            );
            borderClass = 'border-emerald-200 bg-white';
          } else if (toast.type === 'warning') {
            icon = (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            );
            borderClass = 'border-amber-200 bg-white';
          } else if (toast.type === 'error') {
            icon = <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />;
            borderClass = 'border-rose-200 bg-white';
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto p-4 rounded-xl border ${borderClass} shadow-lg flex items-start gap-3 bg-white`}
              id={`toast-item-${toast.id}`}
            >
              {icon}
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-stone-900 leading-tight">
                  {toast.title}
                </p>
                {toast.message && (
                  <p className="text-xs text-stone-600 mt-1 leading-normal">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                id={`toast-dismiss-${toast.id}`}
                onClick={() => dismissToast(toast.id)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-md transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
