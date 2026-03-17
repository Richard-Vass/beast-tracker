'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

/* ─── Types ──────────────────────────────────────────────────── */
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  exiting: boolean;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

/* ─── Design Tokens ──────────────────────────────────────────── */
const COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', icon: '#10B981' },
  error:   { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  icon: '#EF4444' },
  info:    { bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)', icon: '#3B82F6' },
  warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', icon: '#F59E0B' },
};

/* ─── Icons ──────────────────────────────────────────────────── */
const ToastIcon = ({ type, size = 20 }: { type: ToastType; size?: number }) => {
  const color = COLORS[type].icon;
  const props = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  };

  switch (type) {
    case 'success':
      return <svg {...props}><path d="M20 6L9 17l-5-5" /></svg>;
    case 'error':
      return <svg {...props}><path d="M18 6L6 18M6 6l12 12" /></svg>;
    case 'info':
      return <svg {...props}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>;
    case 'warning':
      return <svg {...props}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" /></svg>;
  }
};

/* ─── Animations ─────────────────────────────────────────────── */
const TOAST_STYLES = `
  @keyframes toastSlideIn {
    from { opacity: 0; transform: translateY(-100%) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes toastSlideOut {
    from { opacity: 1; transform: translateY(0) scale(1); }
    to { opacity: 0; transform: translateY(-100%) scale(0.95); }
  }
`;

/* ─── Context ────────────────────────────────────────────────── */
const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

/* ─── Provider & Container ───────────────────────────────────── */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const stylesInjectedRef = useRef(false);

  // Inject keyframes once
  useEffect(() => {
    if (stylesInjectedRef.current) return;
    stylesInjectedRef.current = true;
    const style = document.createElement('style');
    style.textContent = TOAST_STYLES;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  const dismissToast = useCallback((id: string) => {
    // Start exit animation
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    // Remove after animation
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 250);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts(prev => [...prev, { id, message, type, exiting: false }]);

    // Auto dismiss after 3s
    const timer = setTimeout(() => {
      dismissToast(id);
      timersRef.current.delete(id);
    }, 3000);
    timersRef.current.set(id, timer);
  }, [dismissToast]);

  const handleDismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    dismissToast(id);
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container */}
      {toasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '12px 16px',
            pointerEvents: 'none',
          }}
        >
          {toasts.map((toast, index) => {
            const colors = COLORS[toast.type];
            return (
              <div
                key={toast.id}
                style={{
                  pointerEvents: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 16px',
                  marginBottom: 8,
                  borderRadius: 14,
                  background: colors.bg,
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: `1px solid ${colors.border}`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  maxWidth: 400,
                  width: '100%',
                  animation: toast.exiting
                    ? 'toastSlideOut 0.25s ease forwards'
                    : 'toastSlideIn 0.3s ease forwards',
                  animationDelay: toast.exiting ? '0s' : `${index * 0.05}s`,
                  cursor: 'pointer',
                }}
                onClick={() => handleDismiss(toast.id)}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: `${colors.icon}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <ToastIcon type={toast.type} />
                </div>
                <span style={{
                  fontSize: 14, fontWeight: 600,
                  color: '#FFFFFF',
                  flex: 1,
                  lineHeight: 1.3,
                }}>
                  {toast.message}
                </span>
                <div style={{
                  width: 24, height: 24, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  opacity: 0.4,
                }}>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
                    stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}
