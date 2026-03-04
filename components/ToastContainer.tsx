'use client';

import { X } from 'lucide-react';
import type { ToastType } from '@/hooks/useToast';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

const styles: Record<ToastType, string> = {
  error:   'bg-white border-red-500   text-red-700',
  success: 'bg-white border-green-500 text-green-700',
  warning: 'bg-white border-yellow-500 text-yellow-700',
};

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-24 right-6 z-[200] flex flex-col gap-3 max-w-sm w-full">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 border-l-4 px-4 py-3 shadow-lg text-sm ${styles[toast.type]}`}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => onRemove(toast.id)}
            className="text-black/30 hover:text-black transition-colors mt-0.5"
          >
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      ))}
    </div>
  );
}