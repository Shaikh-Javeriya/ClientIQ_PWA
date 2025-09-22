import React from 'react';
import { DollarSign, TrendingUp, Percent, CreditCard, Users, MapPin } from 'lucide-react';
import { Card, CardContent } from './ui/card';

const ClientProfileCard = ({ client, summary }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getMarginColor = (margin) => {
    if (margin >= 30) return 'text-green-600 bg-green-50';
    if (margin >= 15) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case 'Enterprise':
        return 'bg-purple-100 text-purple-800';
      case 'SMB':
        return 'bg-blue-100 text-blue-800';
      case 'Freelance':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="glass-card">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client Info */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {client.name?.charAt(0) || 'C'}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{client.name}</h2>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTierColor(client.tier)}`}>
                    {client.tier}
                  </span>
                  <div className="flex items-center text-gray-500 text-sm">
                    <MapPin className="w-3 h-3 mr-1" />
                    {client.region}
                  </div>
                </div>
              </div>
            </div>
            
            {client.contact_email && (
              <div className="mb-2">
                <span className="text-sm text-gray-600">Email: </span>
                <span className="text-sm font-medium">{client.contact_email}</span>
              </div>
            )}
            
            {client.contact_phone && (
              <div className="mb-2">
                <span className="text-sm text-gray-600">Phone: </span>
                <span className="text-sm font-medium">{client.contact_phone}</span>
              </div>
            )}
            
            <div className="mb-2">
              <span className="text-sm text-gray-600">Hourly Rate: </span>
              <span className="text-sm font-medium">{formatCurrency(client.hourly_rate)}</span>
            </div>
          </div>

          {/* KPI Metrics */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-white border">
                <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.total_revenue)}</p>
                <p className="text-sm text-gray-600">Total Revenue</p>
              </div>
              
              <div className="text-center p-4 rounded-lg bg-white border">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.profit)}</p>
                <p className="text-sm text-gray-600">Gross Profit</p>
              </div>
              
              <div className={`text-center p-4 rounded-lg border ${getMarginColor(summary.margin_percent)}`}>
                <Percent className="w-8 h-8 mx-auto mb-2" />
                <p className="text-2xl font-bold">{(summary.margin_percent || 0).toFixed(1)}%</p>
                <p className="text-sm">Margin</p>
              </div>
              
              <div className={`text-center p-4 rounded-lg border ${summary.outstanding_ar > 0 ? 'text-red-600 bg-red-50' : 'text-gray-600 bg-gray-50'}`}>
                <CreditCard className="w-8 h-8 mx-auto mb-2" />
                <p className="text-2xl font-bold">{formatCurrency(summary.outstanding_ar)}</p>
                <p className="text-sm">Outstanding AR</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientProfileCard;