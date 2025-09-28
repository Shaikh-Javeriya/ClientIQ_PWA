import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  AlertTriangle,
  Database
} from 'lucide-react';

// Import components
import KPICards from './KPICards';
import ClientProfitabilityTable from './ClientProfitabilityTable';
import RevenueChart from './RevenueChart';
import ClientRevenueChart from './ClientRevenueChart';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useToast } from './ui/use-toast';
import { useCurrency } from "./CurrencyContext";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ user }) => {
  const [kpis, setKpis] = useState(null);
  const [clientProfitability, setClientProfitability] = useState([]);
  const [revenueByMonth, setRevenueByMonth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sampleDataLoading, setSampleDataLoading] = useState(false);
  const { toast } = useToast();
  const { currency, locale } = useCurrency();
  const formatCurrency = (value, options = {}) => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: options.minFractionDigits ?? 0,
      notation: options.notation || "standard",
    }).format(value || 0);
  };

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
      toast({
        title: "Success",
        description: "Sample data generated successfully",
      });
    } catch (error) {
      console.error('Error generating sample data:', error);
      setError('Failed to generate sample data. Please try again.');
      toast({
        title: "Error",
        description: "Failed to generate sample data",
        variant: "destructive",
      });
    } finally {
      setSampleDataLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
          <p className="text-gray-600">Get insights into your business performance</p>
        </div>
      </div>

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
          <ClientProfitabilityTable data={clientProfitability.slice(0, 10)} />
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
