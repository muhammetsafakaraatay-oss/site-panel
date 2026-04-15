'use client'

import { useEffect, useState, createContext, useContext } from 'react'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

const icons = {
  success: <CheckCircle2 className="w-5 h-5 text-green-400" />,
  error: <AlertCircle className="w-5 h-5 text-red-400" />,
  info: <Info className="w-5 h-5 text-blue-400" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-400" />
}

const bgColors = {
  success: 'bg-green-500/10 border-green-500/20',
  error: 'bg-red-500/10 border-red-500/20',
  info: 'bg-blue-500/10 border-blue-500/20',
  warning: 'bg-yellow-500/10 border-yellow-500/20'
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = (type: ToastType, message: string, duration: number = 3000) => {
    const id = Math.random().toString(36).substring(7)
    setToasts(prev => [...prev, { id, type, message, duration }])
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${bgColors[toast.type]} backdrop-blur-sm animate-in slide-in-from-right duration-300`}
          >
            {icons[toast.type]}
            <p className="text-sm text-white">{toast.message}</p>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="ml-2 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
