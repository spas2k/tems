import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import App from './App';
import { ConsoleErrorProvider } from './context/ConsoleErrorContext';
import './index.css';

// Global handler to make date inputs show/hide calendar on click anywhere
document.addEventListener('mousedown', (e) => {
  if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'date') {
    // If input is already focused (meaning open), blur it on next click to close
    if (document.activeElement === e.target) {
      e.preventDefault(); 
      e.target.blur();
    }
  }
});

document.addEventListener('click', (e) => {
  if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'date') {
    // Only open if we didn't just forcibly blur it
    if (document.activeElement === e.target) {
      try { e.target.showPicker(); } catch (err) {}
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChakraProvider value={defaultSystem}>
      <ConsoleErrorProvider>
        <App />
      </ConsoleErrorProvider>
    </ChakraProvider>
  </React.StrictMode>
);
