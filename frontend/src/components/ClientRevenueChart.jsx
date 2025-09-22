import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useTheme } from './ThemeProvider';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const ClientRevenueChart = ({ data }) => {
  const { getThemeColors } = useTheme();
  const colors = getThemeColors();

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 opacity-20">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M22 9v6c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V9c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2zm-4 0v6h2V9h-2zm-2 0H8v6h8V9zm-10 0H4v6h2V9z"/>
            </svg>
          </div>
          <p>No data available</p>
        </div>
      </div>
    );
  }

  // Handle different data formats - if it's invoice data, transform it to monthly revenue
  let chartData;
  let sortedData;
  
  if (data[0] && data[0].invoice_date) {
    // This is invoice data - group by month
    const monthlyData = {};
    data.forEach(invoice => {
      if (invoice.status === 'paid' && invoice.paid_date) {
        const date = new Date(invoice.paid_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { revenue: 0, profit: 0 };
        }
        monthlyData[monthKey].revenue += invoice.amount || 0;
        monthlyData[monthKey].profit += (invoice.amount || 0) * 0.75;
      }
    });
    
    sortedData = Object.entries(monthlyData)
      .map(([month, data]) => ({
        client_name: month,
        revenue: data.revenue,
        hours_worked: data.profit / 100 // Scale for visibility
      }))
      .sort((a, b) => a.client_name.localeCompare(b.client_name))
      .slice(-12); // Last 12 months
  } else {
    // This is client profitability data
    sortedData = [...data]
      .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
      .slice(0, 10);
  }

  chartData = {
    labels: sortedData.map(client => {
      const name = client.client_name || 'Unknown';
      return name.length > 15 ? name.substring(0, 15) + '...' : name;
    }),
    datasets: [
      {
        label: 'Revenue',
        data: sortedData.map(client => client.revenue),
        backgroundColor: colors.medium,
        borderColor: colors.dark,
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: 'Hours Worked',
        data: sortedData.map(client => client.hours_worked * 100), // Scale for visibility
        backgroundColor: colors.light,
        borderColor: colors.medium,
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
        yAxisID: 'y1'
      }
    ]
  };

  const options = {
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
            if (context.datasetIndex === 0) {
              const value = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0
              }).format(context.parsed.y);
              return `Revenue: ${value}`;
            } else {
              const hours = context.parsed.y / 100;
              return `Hours: ${hours.toFixed(1)}h`;
            }
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
        type: 'linear',
        display: true,
        position: 'left',
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
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          font: {
            family: 'Inter'
          },
          callback: function(value) {
            return `${(value / 100).toFixed(0)}h`;
          }
        }
      }
    }
  };

  return (
    <div className="h-64">
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default ClientRevenueChart;