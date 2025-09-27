import React from 'react';
import { ArrowUpDown, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';
import CurrencyProvider from "./components/CurrencyContext";

const ClientProfitabilityTable = ({ data }) => {
  const { currency, locale } = useCurrency();
  const formatCurrency = (value, options = {}) => {
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: options.minFractionDigits ?? 0,
      notation: options.notation || "standard", // default is normal numbers
    }).format(value || 0)
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(num);
  };

  const getMarginColor = (margin) => {
    if (margin >= 30) return 'profit-high';
    if (margin >= 15) return 'profit-medium';
    return 'profit-low';
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

  const getStatusIcon = (margin) => {
    if (margin >= 30) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (margin >= 15) return <Minus className="w-4 h-4 text-yellow-600" />;
    return <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <ArrowUpDown className="w-12 h-12 mx-auto" />
        </div>
        <p className="text-gray-600">No client data available</p>
        <p className="text-sm text-gray-500 mt-2">
          Generate sample data or add clients to see profitability analysis
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th className="text-left">Client</th>
            <th className="text-left">Tier</th>
            <th className="text-left">Region</th>
            <th className="text-right">Revenue</th>
            <th className="text-right">Hours</th>
            <th className="text-right">Profit</th>
            <th className="text-right">Margin %</th>
            <th className="text-right">$/Hour</th>
            <th className="text-right">Outstanding AR</th>
            <th className="text-left">Last Invoice</th>
          </tr>
        </thead>
        <tbody>
          {data.map((client, index) => (
            <tr key={client.client_id} className="hover:bg-gray-50 transition-colors duration-200">
              <td className="font-medium text-gray-900">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {client.client_name.charAt(0)}
                  </div>
                  <span>{client.client_name}</span>
                </div>
              </td>
              <td>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTierColor(client.tier)}`}>
                  {client.tier}
                </span>
              </td>
              <td className="text-gray-600">{client.region}</td>
              <td className="text-right font-semibold text-gray-900">
                {formatCurrency(client.revenue)}
              </td>
              <td className="text-right text-gray-600">
                {formatNumber(client.hours_worked)}h
              </td>
              <td className="text-right font-semibold">
                <div className="flex items-center justify-end space-x-1">
                  {getStatusIcon(client.margin_percent)}
                  <span className={getMarginColor(client.margin_percent)}>
                    {formatCurrency(client.profit)}
                  </span>
                </div>
              </td>
              <td className={`text-right font-bold ${getMarginColor(client.margin_percent)}`}>
                {formatNumber(client.margin_percent)}%
              </td>
              <td className="text-right text-gray-600">
                {formatCurrency(client.profit_per_hour)}
              </td>
              <td className="text-right">
                <span className={client.outstanding_ar > 0 ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                  {formatCurrency(client.outstanding_ar)}
                </span>
              </td>
              <td className="text-gray-600">
                {client.last_invoice_date
                  ? format(new Date(client.last_invoice_date), 'MMM dd, yyyy')
                  : 'No invoices'
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ClientProfitabilityTable;