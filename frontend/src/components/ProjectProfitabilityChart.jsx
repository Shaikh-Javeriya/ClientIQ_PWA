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
import { useCurrency } from "./CurrencyContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const ProjectProfitabilityChart = ({ projects }) => {
  const { getThemeColors } = useTheme();
  const colors = getThemeColors();
  const { currency, locale, formatCurrency } = useCurrency();

  if (!projects || projects.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 opacity-20">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M22 9v6c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V9c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2z" />
            </svg>
          </div>
          <p>No projects available</p>
        </div>
      </div>
    );
  }

  const chartData = {
    labels: projects.map(project => {
      const name = project.name || 'Unnamed Project';
      return name.length > 15 ? name.substring(0, 15) + '...' : name;
    }),
    datasets: [
      {
        label: 'Revenue',
        data: projects.map(project => (project.hours_worked || 0) * (project.hourly_rate || 0)),
        backgroundColor: colors.medium,
        borderColor: colors.dark,
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: 'Profit (Est.)',
        data: projects.map(project => {
          const revenue = (project.hours_worked || 0) * (project.hourly_rate || 0);
          return revenue * 0.75; // Assuming 25% overhead
        }),
        backgroundColor: colors.light,
        borderColor: colors.medium,
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
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

  return (
    <div className="h-64">
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default ProjectProfitabilityChart;
