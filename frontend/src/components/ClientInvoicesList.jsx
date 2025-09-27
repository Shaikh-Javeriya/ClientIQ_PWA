import React, { useState } from 'react';
import { Check, Mail, Search } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useCurrency } from "./components/CurrencyContext";

const ClientInvoicesList = ({ invoices, projects, onMarkPaid, onSendReminder }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');

  const { currency, locale } = useCurrency();
  const formatCurrency = (value) =>
    new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);

  const getStatusColor = (status, daysOverdue = 0) => {
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

  const getDaysOverdue = (invoice) => {
    if (invoice.status !== 'overdue' && invoice.status !== 'unpaid') return 0;
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    const diffTime = today - dueDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'General';
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = searchTerm === '' ||
      invoice.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getProjectName(invoice.project_id).toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;

    const matchesProject = projectFilter === 'all' || invoice.project_id === projectFilter;

    return matchesSearch && matchesStatus && matchesProject;
  });

  if (!invoices || invoices.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No invoices found for this client</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>

        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(project => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Invoices Table */}
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="text-left">Invoice #</th>
              <th className="text-left">Project</th>
              <th className="text-right">Amount</th>
              <th className="text-left">Due Date</th>
              <th className="text-left">Payment Status</th>
              <th className="text-center">Days Overdue</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((invoice) => {
              const daysOverdue = getDaysOverdue(invoice);
              return (
                <tr key={invoice.id} className="hover:bg-gray-50 transition-colors duration-200">
                  <td className="font-medium text-gray-900">
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {invoice.id?.slice(-8) || 'N/A'}
                    </span>
                  </td>
                  <td className="text-gray-600">
                    {getProjectName(invoice.project_id)}
                  </td>
                  <td className="text-right font-semibold text-gray-900">
                    {formatCurrency(invoice.amount)}
                  </td>
                  <td className="text-gray-600">
                    {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                  </td>
                  <td>
                    <span className={getStatusColor(invoice.status, daysOverdue)}>
                      {invoice.status?.charAt(0).toUpperCase() + invoice.status?.slice(1)}
                    </span>
                  </td>
                  <td className="text-center">
                    {invoice.status === 'overdue' || (invoice.status === 'unpaid' && daysOverdue > 0) ? (
                      <span className={`font-semibold ${daysOverdue > 30 ? 'text-red-600' : 'text-orange-600'}`}>
                        {daysOverdue}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="text-center">
                    <div className="flex items-center justify-center space-x-1">
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
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredInvoices.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600">No invoices match your current filters</p>
        </div>
      )}
    </div>
  );
};

export default ClientInvoicesList;