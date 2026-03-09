import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

const ConfirmContext = createContext(null);
export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((message, opts = {}) => {
    return new Promise(resolve => {
      resolveRef.current = resolve;
      setState({ message, ...opts });
    });
  }, []);

  const close = (result) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={e => { if (e.target === e.currentTarget) close(false); }}>
          <div className="confirm-dialog">
            <div className="confirm-dialog-icon">
              {state.danger !== false
                ? <Trash2 size={22} color="#dc2626" />
                : <AlertTriangle size={22} color="#d97706" />}
            </div>
            <div className="confirm-dialog-body">
              <div className="confirm-dialog-title">{state.title || 'Confirm'}</div>
              <div className="confirm-dialog-message">{state.message}</div>
            </div>
            <div className="confirm-dialog-actions">
              <button className="btn btn-cancel" onClick={() => close(false)}>Cancel</button>
              <button className={`btn ${state.danger !== false ? 'btn-danger' : 'btn-primary'}`} onClick={() => close(true)} autoFocus>
                {state.confirmLabel || 'Delete'}
              </button>
            </div>
            <button className="confirm-dialog-close" onClick={() => close(false)}><X size={16} /></button>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
