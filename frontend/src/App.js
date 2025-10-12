import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Import components
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import ClientsPage from './components/ClientsPage';
import InvoicesPage from './components/InvoicesPage';
import ClientDrillthrough from './components/ClientDrillthrough';
import ClientDetailsPage from './components/ClientDetailsPage';
import SettingsPage from './components/SettingsPage';
import MainLayout from './components/MainLayout';
import ThemeProvider from './components/ThemeProvider';
import RFMAnalysisPage from './components/RFMAnalysisPage';
import { CurrencyProvider } from "./components/CurrencyContext";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Axios interceptor for auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user_data');

    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_data');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user_data', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <CurrencyProvider>
        <div className="App">
          <HashRouter>
            <Routes>
              <Route
                path="/login"
                element={
                  !user ? (
                    <LoginForm onLogin={handleLogin} />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
              <Route
                path="/"
                element={
                  user ? (
                    <MainLayout user={user} onLogout={handleLogout}>
                      <Dashboard user={user} />
                    </MainLayout>
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
              <Route
                path="/clients"
                element={
                  user ? (
                    <MainLayout user={user} onLogout={handleLogout}>
                      <ClientsPage user={user} />
                    </MainLayout>
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
              <Route
                path="/invoices"
                element={
                  user ? (
                    <MainLayout user={user} onLogout={handleLogout}>
                      <InvoicesPage user={user} />
                    </MainLayout>
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
              <Route
                path="/client-details"
                element={
                  user ? (
                    <MainLayout user={user} onLogout={handleLogout}>
                      <ClientDetailsPage user={user} />
                    </MainLayout>
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
              <Route
                path="/clients/:clientId"
                element={
                  user ? (
                    <MainLayout user={user} onLogout={handleLogout}>
                      <ClientDrillthrough user={user} />
                    </MainLayout>
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
              <Route
                path="/rfm"
                element={
                  user ? (
                    <MainLayout user={user} onLogout={handleLogout}>
                      <RFMAnalysisPage user={user} />
                    </MainLayout>
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
              <Route
                path="/settings"
                element={
                  user ? (
                    <MainLayout user={user} onLogout={handleLogout}>
                      <SettingsPage user={user} />
                    </MainLayout>
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
            </Routes>
          </HashRouter>
        </div>
      </CurrencyProvider>
    </ThemeProvider>
  );
}

export default App;
