import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

const ConsoleErrorContext = createContext({ errors: [], clearErrors: () => {}, formatted: () => '' });

const MAX_ERRORS = 50;

export function ConsoleErrorProvider({ children }) {
  const [errors, setErrors] = useState([]);
  const origConsoleError = useRef(null);

  useEffect(() => {
    // Capture console.error
    origConsoleError.current = console.error;
    console.error = (...args) => {
      origConsoleError.current.apply(console, args);
      const message = args.map(a =>
        typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
      ).join(' ');
      setErrors(prev => [
        ...prev.slice(-(MAX_ERRORS - 1)),
        { message, timestamp: new Date().toISOString() },
      ]);
    };

    // Capture unhandled errors
    const handleError = (event) => {
      const msg = `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`;
      setErrors(prev => [
        ...prev.slice(-(MAX_ERRORS - 1)),
        { message: msg, timestamp: new Date().toISOString() },
      ]);
    };

    // Capture unhandled promise rejections
    const handleRejection = (event) => {
      const msg = `Unhandled Promise: ${event.reason?.message || event.reason || 'unknown'}`;
      setErrors(prev => [
        ...prev.slice(-(MAX_ERRORS - 1)),
        { message: msg, timestamp: new Date().toISOString() },
      ]);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      console.error = origConsoleError.current;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const clearErrors = useCallback(() => setErrors([]), []);

  const formatted = useCallback(() => {
    if (errors.length === 0) return '';
    return errors.map(e =>
      `[${new Date(e.timestamp).toLocaleTimeString()}] ${e.message}`
    ).join('\n');
  }, [errors]);

  return (
    <ConsoleErrorContext.Provider value={{ errors, clearErrors, formatted }}>
      {children}
    </ConsoleErrorContext.Provider>
  );
}

export const useConsoleErrors = () => useContext(ConsoleErrorContext);
