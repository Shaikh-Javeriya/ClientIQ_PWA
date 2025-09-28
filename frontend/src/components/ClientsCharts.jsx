import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Scatter } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { BarChart3, Activity } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useCurrency } from "./CurrencyContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const ClientsCharts = ({ clients }) => {
  const { getThemeColors } = useTheme();
  const colors = getThemeColors();
  const { currency, locale, formatCurrency } = useCurrency();
  
  if (!clients || clients.length === 0) {
    return null;
  }

  // Revenue vs Profit Bar Chart Data
  const topClients = [...clients]
    .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
    .slice(0, 10);

  const barChartData = {
    labels: topClients.map(client => {
      const name = client.client_name || client.name || 'Unknown';
      return name.length > 12 ? name.substring(0, 12) + '...' : name;
    }),
    datasets: [
      {
        label: 'Revenue',
        data: topClients.map(client => client.revenue || 0),
        backgroundColor: colors.medium,
        borderColor: colors.dark,
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: 'Profit',
        data: topClients.map(client => client.profit || 0),
        backgroundColor: colors.light,
        borderColor: colors.medium,
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            family: 'Inter',
            weight: '500'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1F2937',
        bodyColor: '#1F2937',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function (context) {
            const value = formatCurrency(context.parsed.y);
            return `${context.dataset.label}: ${value}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          font: {
            family: 'Inter',
            size: 11
          }
        }
      },
      y: {
        grid: {
          color: '#F3F4F6'
        },
        ticks: {
          font: {
            family: 'Inter'
          },
          callback: function (value) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  // Revenue vs Hours Scatter Plot Data
  const scatterData = {
    datasets: [
      {
        label: 'Clients',
        data: clients.map(client => ({
          x: client.hours_worked || 0,
          y: client.revenue || 0,
          clientName: client.client_name || client.name || 'Unknown',
          margin: client.margin_percent || 0
        })),
        backgroundColor: clients.map(client => {
          const margin = client.margin_percent || 0;
          if (margin >= 30) return '#16A34A'; // Green for high margin
          if (margin >= 15) return '#F59E0B'; // Amber for medium margin
          return '#EF4444'; // Red for low margin
        }),
        borderColor: colors.dark,
        borderWidth: 2,
        pointRadius: 8,
        pointHoverRadius: 10,
      }
    ]
  };

  const scatterOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1F2937',
        bodyColor: '#1F2937',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          title: function (context) {
            return context[0].raw.clientName;
          },
          label: function (context) {
            const data = context.raw;
            return [
              `Hours: ${data.x.toFixed(1)}h`,
              `Revenue: ${formatCurrency(data.y)}`,
              `Margin: ${data.margin.toFixed(1)}%`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Hours Worked',
          font: {
            family: 'Inter',
            weight: '600'
          }
        },
        grid: {
          color: '#F3F4F6'
        },
        ticks: {
          font: {
            family: 'Inter'
          }
        }
      },
      y: {
        title: {
          display: true,
          text: 'Revenue ($)',
          font: {
            family: 'Inter',
            weight: '600'
          }
        },
        grid: {
          color: '#F3F4F6'
        },
        ticks: {
          font: {
            family: 'Inter'
          },
          callback: function (value) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Revenue vs Profit Bar Chart */}
      <Card className="chart-container">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Top 10 Clients - Revenue vs Profit</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Revenue vs Hours Scatter Plot */}
      <Card className="chart-container">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Revenue vs Hours - Efficiency Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <Scatter data={scatterData} options={scatterOptions} />
          </div>
          <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>High Margin (30%+)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>Medium Margin (15-30%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Low Margin (&lt;15%)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClientsCharts;
