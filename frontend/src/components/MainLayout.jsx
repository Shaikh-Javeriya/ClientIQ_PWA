import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  BarChart3,
  Users,
  DollarSign,
  Settings,
  User,
  LogOut,
  RefreshCw,
  Database
} from 'lucide-react';
import { Button } from './ui/button';

const MainLayout = ({ user, onLogout, children }) => {
  const location = useLocation();

  const navigation = [
    { name: 'Overview', path: '/', icon: BarChart3 },
    { name: 'Clients', path: '/clients', icon: Users },
    { name: 'Client Details', path: '/client-details', icon: User },
    { name: 'Invoices', path: '/invoices', icon: DollarSign },
    { name: 'RFM Insights', path: '/rfm', icon: Database },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    ClientIQ
                  </h1>
                  <p className="text-sm text-gray-500">Welcome back, {user.name}</p>
                </div>
              </div>

              {/* Navigation */}
              <nav className="hidden md:flex space-x-4 lg:space-x-5">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors duration-200 ${
                        isActive(item.path)
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              {/* Icon-only refresh and logout buttons to free space for an extra nav item */}
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
                className="p-2"
                title="Refresh"
                aria-label="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>

              <Button
                onClick={onLogout}
                variant="outline"
                size="sm"
                className="p-2 text-red-600 border-red-200 hover:bg-red-50"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Mobile Navigation */}
      <nav className="mobile-nav md:hidden">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`mobile-nav-item ${isActive(item.path) ? 'active' : ''}`}
            >
              <Icon className="w-5 h-5 mb-1" />
              {item.name}
            </Link>
          );
        })}
        <button onClick={onLogout} className="mobile-nav-item text-red-600">
          <LogOut className="w-5 h-5 mb-1" />
          Logout
        </button>
      </nav>
    </div>
  );
};

export default MainLayout;
