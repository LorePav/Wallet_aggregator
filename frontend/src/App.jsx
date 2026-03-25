import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { PortfolioProvider } from './context/PortfolioContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import Transactions from './pages/Transactions';
import Settings from './pages/Settings';
import Login from './pages/Login';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const pwd = localStorage.getItem('api_password');
    if (pwd) {
      axios.defaults.headers.common['x-api-password'] = pwd;
      setIsAuthenticated(true);
    }
    
    // Interceptor per le chiamate Axios per disconnettere automaticamente se il token scade o è invalido
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response && error.response.status === 401) {
          localStorage.removeItem('api_password');
          setIsAuthenticated(false);
        }
        return Promise.reject(error);
      }
    );
    
    setIsInitializing(false);
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  if (isInitializing) return null;

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <PortfolioProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="portfolio" element={<Portfolio />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PortfolioProvider>
  );
};

export default App;
