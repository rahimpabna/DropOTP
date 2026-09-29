import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  HelpCircle,
  Info,
  X,
} from 'lucide-react';

export type DialogType = 'info' | 'success' | 'warning' | 'error' | 'confirm';

interface DialogOptions {
  title?: string;
  message: string;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
}

interface DialogContextValue {
  showConfirm: (options: DialogOptions | string) => Promise<boolean>;
  showAlert: (options: DialogOptions | string) => Promise<void>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<DialogOptions & { isConfirm: boolean }>({
    message: '',
    isConfirm: false,
  });
  const [resolver, setResolver] = useState<((val: boolean) => void) | null>(null);

  const showConfirm = useCallback((options: DialogOptions | string): Promise<boolean> => {
    const config: DialogOptions = typeof options === 'string' ? { message: options } : options;
    setDialogConfig({
      title: config.title || 'Confirmation Required',
      message: config.message,
      type: config.type || 'confirm',
      confirmText: config.confirmText || 'Confirm',
      cancelText: config.cancelText || 'Cancel',
      isConfirm: true,
    });
    setIsOpen(true);

    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const showAlert = useCallback((options: DialogOptions | string): Promise<void> => {
    const config: DialogOptions = typeof options === 'string' ? { message: options } : options;
    setDialogConfig({
      title: config.title || 'Notification',
      message: config.message,
      type: config.type || 'info',
      confirmText: config.confirmText || 'Got it',
      cancelText: '',
      isConfirm: false,
    });
    setIsOpen(true);

    return new Promise<void>((resolve) => {
      setResolver(() => () => resolve());
    });
  }, []);

  const handleClose = (confirmed: boolean) => {
    setIsOpen(false);
    if (resolver) {
      resolver(confirmed);
      setResolver(null);
    }
  };

  const getIcon = () => {
    switch (dialogConfig.type) {
      case 'success':
        return <CheckCircle2 className="w-8 h-8 text-emerald-500" />;
      case 'warning':
        return <AlertTriangle className="w-8 h-8 text-amber-500" />;
      case 'error':
        return <AlertOctagon className="w-8 h-8 text-rose-500" />;
      case 'confirm':
        return <HelpCircle className="w-8 h-8 text-teal-600" />;
      default:
        return <Info className="w-8 h-8 text-sky-500" />;
    }
  };

  return (
    <DialogContext.Provider value={{ showConfirm, showAlert }}>
      {children}

      {/* Centered Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100/80 space-y-5 animate-in zoom-in-95 duration-200 relative">
            {/* Close icon button */}
            <button
              onClick={() => handleClose(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header with Icon and Title */}
            <div className="flex items-start space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-sm">
                {getIcon()}
              </div>
              <div className="pr-6">
                <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug">
                  {dialogConfig.title}
                </h3>
                <p className="text-xs font-semibold text-teal-700 mt-0.5">DropOTP System Action</p>
              </div>
            </div>

            {/* Message Body */}
            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 text-xs font-medium text-slate-700 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
              {dialogConfig.message}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-2.5 pt-2">
              {dialogConfig.isConfirm && (
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all active:scale-95"
                >
                  {dialogConfig.cancelText || 'Cancel'}
                </button>
              )}

              <button
                type="button"
                onClick={() => handleClose(true)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-500/20 transition-all active:scale-95"
              >
                {dialogConfig.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};

export const useDialog = (): DialogContextValue => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};
