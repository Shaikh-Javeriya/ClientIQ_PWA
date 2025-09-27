import React from 'react';
import { Eye, Check, Mail, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { useCurrency } from "./CurrencyContext";

const InvoicesTable = ({ invoices, onEdit, onDelete, onMarkPaid, onSendReminder }) => {
  const { currency, locale } = useCurrency();
  const formatCurrency = (value, options = {}) => {
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: options.minFractionDigits ?? 0,
      notation: options.notation || "standard", // default is normal numbers
    }).format(value || 0)
  };

  const getStatusColor = (status, daysOverdue) => {
    switch (status) {
      case 'paid':
        return 'status-paid';
      case 'overdue':
        return daysOverdue > 30 ? 'status-overdue' : 'bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-semibold';
      case 'unpaid':
        return 'status-unpaid';
      default:
        return 'bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-semibold';
    }
  };

  const getOverdueIndicator = (status, daysOverdue) => {
    if (status === 'overdue' && daysOverdue > 30) {
      return <AlertTriangle className="w-4 h-4 text-red-600 ml-1" />;
    }
    return null;
  };

  if (!invoices || invoices.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <Eye className="w-12 h-12 mx-auto" />
        </div>
        <p className="text-gray-600">No invoices found</p>
        <p className="text-sm text-gray-500 mt-2">
          Add invoices or adjust your filters to see data
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th className="text-left">Invoice #</th>
            <th className="text-left">Client</th>
            <th className="text-right">Amount</th>
            <th className="text-left">Invoice Date</th>
            <th className="text-left">Due Date</th>
            <th className="text-left">Payment Status</th>
            <th className="text-center">Days Overdue</th>
            <th className="text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice, index) => (
            <tr key={invoice.id || index} className="hover:bg-gray-50 transition-colors duration-200">
              <td className="font-medium text-gray-900">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                    {invoice.id?.slice(-8) || `INV-${index + 1}`}
                  </span>
                </div>
              </td>
              <td className="text-gray-900">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                    {(invoice.client_name || 'C').charAt(0)}
                  </div>
                  <span>{invoice.client_name || 'Unknown Client'}</span>
                </div>
              </td>
              <td className="text-right font-semibold text-gray-900">
                {formatCurrency(invoice.amount)}
              </td>
              <td className="text-gray-600">
                {format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}
              </td>
              <td className="text-gray-600">
                {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
              </td>
              <td>
                <div className="flex items-center">
                  <span className={getStatusColor(invoice.status, invoice.days_overdue)}>
                    {invoice.status?.charAt(0).toUpperCase() + invoice.status?.slice(1)}
                  </span>
                  {getOverdueIndicator(invoice.status, invoice.days_overdue)}
                </div>
              </td>
              <td className="text-center">
                {invoice.status === 'overdue' ? (
                  <span className={`font-semibold ${invoice.days_overdue > 30 ? 'text-red-600' : 'text-orange-600'}`}>
                    {invoice.days_overdue}
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="text-center">
                <div className="flex items-center justify-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(invoice)}
                    className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                    title="Edit Invoice"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>

                  {invoice.status !== 'paid' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMarkPaid(invoice.id)}
                      className="h-8 w-8 p-0 hover:bg-green-50 hover:text-green-600"
                      title="Mark as Paid"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  )}

                  {invoice.status === 'overdue' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSendReminder(invoice)}
                      className="h-8 w-8 p-0 hover:bg-orange-50 hover:text-orange-600"
                      title="Send Reminder"
                    >
                      <Mail className="w-4 h-4" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(invoice.id)}
                    className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                    title="Delete Invoice"
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

export default InvoicesTable;
