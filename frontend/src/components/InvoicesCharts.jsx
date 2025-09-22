import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { BarChart3, TrendingUp } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { format, subMonths, startOfMonth } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const InvoicesCharts = ({ invoices, arAging }) => {
  const { getThemeColors } = useTheme();
  const colors = getThemeColors();

  if (!invoices || invoices.length === 0) {
    return null;
  }

  // AR Aging Chart Data
  const arAgingData = {
    labels: ['0-30 Days', '31-60 Days', '61-90 Days', '90+ Days'],
    datasets: [
      {
        label: 'Outstanding Amount',
        data: [
          arAging['0-30'] || 0,
          arAging['31-60'] || 0,
          arAging['61-90'] || 0,
          arAging['90+'] || 0
        ],
        backgroundColor: [
          colors.light,
          colors.medium,
          '#F59E0B', // Amber
          '#EF4444'  // Red
        ],
        borderColor: [
          colors.medium,
          colors.dark,
          '#D97706',
          '#DC2626'
        ],
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
      }
    ]
  };

  const arAgingOptions = {
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
          label: function(context) {
            const value = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0
            }).format(context.parsed.y);
            return `Outstanding: ${value}`;
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
          callback: function(value) {
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              notation: 'compact'
            }).format(value);
          }
        }
      }
    }
  };

  // Monthly Revenue Trend Data
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = startOfMonth(subMonths(new Date(), 5 - i));
    return date;
  });

  const monthlyData = last6Months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    
    const monthInvoices = invoices.filter(invoice => {
      const invoiceDate = new Date(invoice.invoice_date);
      return invoiceDate >= monthStart && invoiceDate <= monthEnd;
    });

    const totalInvoiced = monthInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const totalPaid = monthInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const totalUnpaid = monthInvoices
      .filter(inv => inv.status !== 'paid')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);

    return {
      month: format(month, 'MMM yy'),
      totalInvoiced,
      totalPaid,
      totalUnpaid
    };
  });

  const monthlyTrendData = {
    labels: monthlyData.map(data => data.month),
    datasets: [
      {
        label: 'Total Invoiced',
        data: monthlyData.map(data => data.totalInvoiced),
        borderColor: colors.dark,
        backgroundColor: `${colors.dark}20`,
        fill: false,
        tension: 0.4,
        pointBackgroundColor: colors.dark,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
      {
        label: 'Paid',
        data: monthlyData.map(data => data.totalPaid),
        borderColor: '#16A34A', // Green
        backgroundColor: '#16A34A20',
        fill: false,
        tension: 0.4,
        pointBackgroundColor: '#16A34A',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
      {
        label: 'Unpaid',
        data: monthlyData.map(data => data.totalUnpaid),
        borderColor: '#EF4444', // Red
        backgroundColor: '#EF444420',
        fill: false,
        tension: 0.4,
        pointBackgroundColor: '#EF4444',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      }
    ]
  };

  const monthlyTrendOptions = {
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
          label: function(context) {
            const value = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0
            }).format(context.parsed.y);
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
          font: {
            family: 'Inter'
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
          callback: function(value) {
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              notation: 'compact'
            }).format(value);
          }
        }
      }
    },
    elements: {
      line: {
        borderWidth: 3
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* AR Aging Chart */}
      <Card className="chart-container">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Accounts Receivable Aging</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <Bar data={arAgingData} options={arAgingOptions} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Current (0-30):</span>
              <span className="font-semibold">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(arAging['0-30'] || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">31-60 Days:</span>
              <span className="font-semibold">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(arAging['31-60'] || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">61-90 Days:</span>
              <span className="font-semibold text-orange-600">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(arAging['61-90'] || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">90+ Days:</span>
              <span className="font-semibold text-red-600">
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(arAging['90+'] || 0)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Revenue Trend */}
      <Card className="chart-container">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Monthly Revenue Trend</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <Line data={monthlyTrendData} options={monthlyTrendOptions} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoicesCharts;