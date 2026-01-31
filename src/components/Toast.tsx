import { useEffect } from 'react';
import { useToastStore } from '../stores/toastStore';

const ToastItem = ({
  id,
  message,
  type,
}: { id: number; message: string; type: 'success' | 'error' }) => {
  const removeToast = useToastStore((state) => state.removeToast);

  useEffect(() => {
    const timer = setTimeout(() => removeToast(id), 2500);
    return () => clearTimeout(timer);
  }, [id, removeToast]);

  const bg = type === 'success' ? 'bg-green-600' : 'bg-red-600';

  return <div className={`${bg} rounded px-4 py-2 text-sm text-white shadow-lg`}>{message}</div>;
};

export const ToastContainer = () => {
  const toasts = useToastStore((state) => state.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-16 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} id={t.id} message={t.message} type={t.type} />
      ))}
    </div>
  );
};
