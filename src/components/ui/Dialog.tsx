import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

type DialogType = 'alert' | 'confirm' | 'prompt'

interface DialogOptions {
    title?: string
    message: string
    confirmText?: string
    cancelText?: string
    type?: DialogType
    placeholder?: string // for prompt
}

interface DialogContextType {
    showAlert: (message: string, options?: Omit<DialogOptions, 'message' | 'type'>) => Promise<void>
    showConfirm: (message: string, options?: Omit<DialogOptions, 'message' | 'type'>) => Promise<boolean>
    // showPrompt could be added later if needed
}

const DialogContext = createContext<DialogContextType | undefined>(undefined)

export function useDialog() {
    const context = useContext(DialogContext)
    if (!context) {
        throw new Error('useDialog must be used within a DialogProvider')
    }
    return context
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    const [config, setConfig] = useState<DialogOptions>({ message: '', type: 'alert' })
    const [resolvePromise, setResolvePromise] = useState<(value: any) => void>(() => { })

    const dialogRef = useRef<HTMLDivElement>(null)

    const showAlert = useCallback((message: string, options: Omit<DialogOptions, 'message' | 'type'> = {}) => {
        return new Promise<void>((resolve) => {
            setConfig({ ...options, message, type: 'alert' })
            setResolvePromise(() => resolve)
            setIsOpen(true)
        })
    }, [])

    const showConfirm = useCallback((message: string, options: Omit<DialogOptions, 'message' | 'type'> = {}) => {
        return new Promise<boolean>((resolve) => {
            setConfig({ ...options, message, type: 'confirm' })
            setResolvePromise(() => resolve)
            setIsOpen(true)
        })
    }, [])

    const handleClose = (result: any) => {
        setIsOpen(false)
        resolvePromise(result)
    }

    // Animation and focus trap could be improved here, doing basic nice UI for now

    return (
        <DialogContext.Provider value={{ showAlert, showConfirm }}>
            {children}
            {isOpen && (
                <div className="dialog-overlay">
                    <div className="dialog-content glass-panel" ref={dialogRef}>
                        <h3 className="dialog-title">{config.title || (config.type === 'confirm' ? 'Confirm' : 'Alert')}</h3>
                        <p className="dialog-message">{config.message}</p>

                        <div className={`dialog-actions ${config.type === 'confirm' ? 'split' : 'single'}`}>
                            {config.type === 'confirm' && (
                                <button
                                    className="dialog-btn cancel"
                                    onClick={() => handleClose(false)}
                                >
                                    {config.cancelText || 'Cancel'}
                                </button>
                            )}
                            <button
                                className="dialog-btn confirm"
                                onClick={() => handleClose(true)}
                            >
                                {config.confirmText || 'OK'}
                            </button>
                        </div>
                    </div>
                    <style>{`
            .dialog-overlay {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0, 0, 0, 0.6);
              backdrop-filter: blur(4px);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 9999;
              animation: fadeIn 0.2s ease-out;
            }
            .glass-panel {
              background: rgba(30, 30, 35, 0.85);
              backdrop-filter: blur(20px);
              -webkit-backdrop-filter: blur(20px);
              border: 1px solid rgba(255, 255, 255, 0.1);
              box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
              border-radius: 20px;
              padding: 24px;
              width: 90%;
              max-width: 400px;
              color: white;
              animation: scaleIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
              display: flex;
              flex-direction: column;
              gap: 16px;
            }
            .dialog-title {
              margin: 0;
              font-size: 1.25rem;
              font-weight: 600;
              background: linear-gradient(to right, #fff, #bbb);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            }
            .dialog-message {
              margin: 0;
              font-size: 1rem;
              color: rgba(255, 255, 255, 0.8);
              line-height: 1.5;
            }
            .dialog-actions {
              display: flex;
              gap: 12px;
              margin-top: 8px;
            }
            .dialog-actions.single {
              justify-content: flex-end;
            }
            .dialog-actions.split {
              justify-content: space-between;
            }
            .dialog-btn {
              padding: 10px 20px;
              border-radius: 12px;
              border: none;
              font-weight: 600;
              font-size: 0.95rem;
              cursor: pointer;
              transition: all 0.2s;
              flex: 1;
            }
            .dialog-btn.confirm {
              background: linear-gradient(135deg, #ff416c, #ff4b2b);
              color: white;
              box-shadow: 0 4px 15px rgba(255, 65, 108, 0.3);
            }
            .dialog-btn.confirm:hover {
              transform: translateY(-1px);
              box-shadow: 0 6px 20px rgba(255, 65, 108, 0.4);
            }
            .dialog-btn.cancel {
              background: rgba(255, 255, 255, 0.1);
              color: rgba(255, 255, 255, 0.8);
            }
            .dialog-btn.cancel:hover {
              background: rgba(255, 255, 255, 0.15);
              color: white;
            }
            
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes scaleIn {
              from { opacity: 0; transform: scale(0.9) translateY(10px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>
                </div>
            )}
        </DialogContext.Provider>
    )
}
