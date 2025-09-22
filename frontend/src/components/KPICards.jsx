import React from 'react';
import { DollarSign, TrendingUp, Percent, Clock, CreditCard, Timer } from 'lucide-react';
import { Card, CardContent } from './ui/card';

const KPICards = ({ data }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(num);
  };

  const kpiItems = [
    {
      title: 'Total Revenue',
      value: formatCurrency(data.total_revenue),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100'
    },
    {
      title: 'Gross Profit',
      value: formatCurrency(data.gross_profit),
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100'
    },
    {
      title: 'Gross Margin',
      value: `${formatNumber(data.gross_margin_percent)}%`,
      icon: Percent,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      iconBg: 'bg-purple-100'
    },
    {
      title: 'Outstanding AR',
      value: formatCurrency(data.outstanding_ar),
      icon: CreditCard,
      color: data.outstanding_ar > 10000 ? 'text-red-600' : 'text-orange-600',
      bgColor: data.outstanding_ar > 10000 ? 'bg-red-50' : 'bg-orange-50',
      iconBg: data.outstanding_ar > 10000 ? 'bg-red-100' : 'bg-orange-100'
    },
    {
      title: 'Days Sales Outstanding',
      value: `${formatNumber(data.days_sales_outstanding)} days`,
      icon: Clock,
      color: data.days_sales_outstanding > 60 ? 'text-red-600' : 'text-teal-600',
      bgColor: data.days_sales_outstanding > 60 ? 'bg-red-50' : 'bg-teal-50',
      iconBg: data.days_sales_outstanding > 60 ? 'bg-red-100' : 'bg-teal-100'
    },
    {
      title: 'Billable Hours',
      value: formatNumber(data.billable_hours),
      icon: Timer,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      iconBg: 'bg-indigo-100'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {kpiItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <Card key={index} className="kpi-card fade-in hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {item.title}
                  </p>
                  <p className={`text-2xl font-bold ${item.color}`}>
                    {item.value}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${item.iconBg}`}>
                  <Icon className={`w-6 h-6 ${item.color}`} />
                </div>
              </div>
              
              {/* Trend indicator placeholder */}
              <div className="mt-4 flex items-center">
                <div className="flex items-center text-sm text-gray-500">
                  <TrendingUp className="w-4 h-4 mr-1 text-green-500" />
                  <span>vs last month</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default KPICards;