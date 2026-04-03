import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import { supabase } from './supabaseClient';
import { PortfolioProvider } from './context/PortfolioContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import Transactions from './pages/Transactions';
import Settings from './pages/Settings';
import Login from './pages/Login';
import UpdatePassword from './pages/UpdatePassword';

const App = () => {
  const [session, setSession] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // 1. Recupera la sessione iniziale
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${session.access_token}`;
      }
      setIsInitializing(false);
    });

    // 2. Ascolta i cambiamenti di autenticazione (login/logout/token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${session.access_token}`;
      } else {
        delete axios.defaults.headers.common['Authorization'];
      }
    });

    // 3. Intercettore per chiamate API non autorizzate
    const interceptor = axios.interceptors.response.use(
      response => response,
      async error => {
        if (error.response && error.response.status === 401) {
          // Se il backend risponde con 401, il token è invalido, sloggiamo l'utente
          await supabase.auth.signOut();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      subscription.unsubscribe();
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  if (isInitializing) return null;

  if (!session) {
    return <Login />;
  }

  return (
    <PortfolioProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/update-password" element={<UpdatePassword />} />
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
