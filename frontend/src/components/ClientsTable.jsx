import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, Download, Mail, Edit, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from './ui/button';

const ClientsTable = ({ clients, onEdit, onDelete, onExport, onSendReminder }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(num || 0);
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

  if (!clients || clients.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <Eye className="w-12 h-12 mx-auto" />
        </div>
        <p className="text-gray-600">No clients found</p>
        <p className="text-sm text-gray-500 mt-2">
          Add clients or adjust your filters to see data
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th className="text-left">Client Name</th>
            <th className="text-left">Tier</th>
            <th className="text-left">Region</th>
            <th className="text-right">Revenue</th>
            <th className="text-right">Profit</th>
            <th className="text-right">Margin %</th>
            <th className="text-right">Profit/Hour</th>
            <th className="text-right">Outstanding AR</th>
            <th className="text-left">Last Invoice</th>
            <th className="text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client, index) => (
            <tr key={client.id || client.client_id || index} className="hover:bg-gray-50 transition-colors duration-200">
              <td className="font-medium text-gray-900">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {(client.client_name || client.name || 'C').charAt(0)}
                  </div>
                  <Link 
                    to={`/clients/${client.id || client.client_id}`}
                    className="cursor-pointer hover:text-blue-600 transition-colors font-medium"
                  >
                    {client.client_name || client.name || 'Unknown Client'}
                  </Link>
                </div>
              </td>
              <td>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTierColor(client.tier)}`}>
                  {client.tier || 'N/A'}
                </span>
              </td>
              <td className="text-gray-600">{client.region || 'N/A'}</td>
              <td className="text-right font-semibold text-gray-900">
                {formatCurrency(client.revenue)}
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
              <td className="text-center">
                <div className="flex items-center justify-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(client)}
                    className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                    title="Edit Client"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onExport(client)}
                    className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-600"
                    title="Export Data"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  
                  {client.outstanding_ar > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSendReminder(client)}
                      className="h-8 w-8 p-0 hover:bg-orange-50 hover:text-orange-600"
                      title="Send Reminder"
                    >
                      <Mail className="w-4 h-4" />
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(client.id || client.client_id)}
                    className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                    title="Delete Client"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ClientsTable;