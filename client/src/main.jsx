import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import App from './App';
import { ConsoleErrorProvider } from './context/ConsoleErrorContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChakraProvider value={defaultSystem}>
      <ConsoleErrorProvider>
        <App />
      </ConsoleErrorProvider>
    </ChakraProvider>
  </React.StrictMode>
);
