import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && <ToastMessage toast={toast} onClose={hideToast} />}
    </ToastContext.Provider>
  );
}

function ToastMessage({ toast, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const bgColor = toast.type === 'success' ? 'bg-primary-container text-on-primary-container' : 'bg-error-container text-on-error-container';
  const icon = toast.type === 'success' ? 'check_circle' : 'error';

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className={`${bgColor} px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 border border-outline-variant/20`}>
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
        <p className="font-body-md whitespace-nowrap">{toast.message}</p>
        <button onClick={onClose} className="ml-2 hover:bg-black/10 p-1 rounded-full flex transition-colors">
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    </div>
  );
}
