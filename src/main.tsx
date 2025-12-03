import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider } from './contexts/ToastContext';
import { TutorialProvider } from './contexts/TutorialContext';
import { DarkModeProvider } from './contexts/DarkModeContext';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DarkModeProvider>
      <ToastProvider>
        <TutorialProvider>
          <App />
        </TutorialProvider>
      </ToastProvider>
    </DarkModeProvider>
  </React.StrictMode>
);
