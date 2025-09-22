import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Clock, 
  AlertTriangle,
  LogOut,
  Palette,
  RefreshCw,
  Database
} from 'lucide-react';

// Import components
import KPICards from './KPICards';
import ClientProfitabilityTable from './ClientProfitabilityTable';
import RevenueChart from './RevenueChart';
import ClientRevenueChart from './ClientRevenueChart';
import ThemeSelector from './ThemeSelector';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useTheme } from './ThemeProvider';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ user, onLogout }) => {
  const [kpis, setKpis] = useState(null);
  const [clientProfitability, setClientProfitability] = useState([]);
  const [revenueByMonth, setRevenueByMonth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sampleDataLoading, setSampleDataLoading] = useState(false);
  const { themeConfig } = useTheme();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const [kpisResponse, profitabilityResponse, revenueResponse] = await Promise.all([
        axios.get(`${API}/dashboard/kpis`),
        axios.get(`${API}/dashboard/client-profitability`),
        axios.get(`${API}/dashboard/revenue-by-month`)
      ]);

      setKpis(kpisResponse.data);
      setClientProfitability(profitabilityResponse.data);
      setRevenueByMonth(revenueResponse.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateSampleData = async () => {
    try {
      setSampleDataLoading(true);
      await axios.post(`${API}/data/generate-sample`);
      await fetchDashboardData();
    } catch (error) {
      console.error('Error generating sample data:', error);
      setError('Failed to generate sample data. Please try again.');
    } finally {
      setSampleDataLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Client Profitability Dashboard
                  </h1>
                  <p className="text-sm text-gray-500">Welcome back, {user.name}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <ThemeSelector />
              
              <Button
                onClick={fetchDashboardData}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </Button>

              <Button
                onClick={onLogout}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2 text-red-600 border-red-200 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Sample Data Section */}
        {(!kpis || kpis.total_revenue === 0) && (
          <Card className="mb-8 border-2 border-dashed border-gray-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="w-5 h-5" />
                <span>No Data Available</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                It looks like you don't have any data yet. Generate sample data to see how the dashboard works, 
                or start by adding your own clients and invoices.
              </p>
              <Button
                onClick={generateSampleData}
                disabled={sampleDataLoading}
                className="btn-primary"
              >
                {sampleDataLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Generating...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Database className="w-4 h-4" />
                    <span>Generate Sample Data</span>
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        {kpis && <KPICards data={kpis} />}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Revenue Trend Chart */}
          <Card className="chart-container">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>Revenue & Profit Trend</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueChart data={revenueByMonth} />
            </CardContent>
          </Card>

          {/* Client Revenue Chart */}
          <Card className="chart-container">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Top Clients by Revenue</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ClientRevenueChart data={clientProfitability.slice(0, 10)} />
            </CardContent>
          </Card>
        </div>

        {/* Client Profitability Table */}
        <Card className="chart-container">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Client Profitability Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ClientProfitabilityTable data={clientProfitability} />
          </CardContent>
        </Card>
      </main>

      {/* Mobile Navigation */}
      <nav className="mobile-nav">
        <a href="#" className="mobile-nav-item active">
          <BarChart3 className="w-5 h-5 mb-1" />
          Overview
        </a>
        <a href="#" className="mobile-nav-item">
          <Users className="w-5 h-5 mb-1" />
          Clients
        </a>
        <a href="#" className="mobile-nav-item">
          <DollarSign className="w-5 h-5 mb-1" />
          Invoices
        </a>
        <a href="#" className="mobile-nav-item">
          <Palette className="w-5 h-5 mb-1" />
          Settings
        </a>
      </nav>
    </div>
  );
};

export default Dashboard;