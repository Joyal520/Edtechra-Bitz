import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from '@/routes';
import { AuthProvider } from '@/context/AuthContext';
import { BitzThemeProvider } from '@/context/BitzThemeContext';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BitzThemeProvider>
          <AppRoutes />
        </BitzThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
