import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useToast } from './ui/use-toast';
import { format } from 'date-fns';
import { useCurrency } from "./CurrencyContext";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const InvoiceFormModal = ({ invoice, clients, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    client_id: '',
    amount: '',
    hours_billed: '',
    invoice_date: '',
    due_date: '',
    status: 'unpaid'
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { currency, locale } = useCurrency();
  const formatCurrency = (value, options = {}) => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: options.minFractionDigits ?? 0,
      notation: options.notation || "standard",
    }).format(value || 0);
  };

  useEffect(() => {
    if (invoice) {
      setFormData({
        client_id: invoice.client_id || '',
        amount: invoice.amount?.toString() || '',
        hours_billed: invoice.hours_billed?.toString() || '',
        invoice_date: invoice.invoice_date ? format(new Date(invoice.invoice_date), 'yyyy-MM-dd') : '',
        due_date: invoice.due_date ? format(new Date(invoice.due_date), 'yyyy-MM-dd') : '',
        status: invoice.status || 'unpaid'
      });
    } else {
      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setDate(today.getDate() + 30);

      setFormData({
        client_id: '',
        amount: '',
        hours_billed: '',
        invoice_date: format(today, 'yyyy-MM-dd'),
        due_date: format(dueDate, 'yyyy-MM-dd'),
        status: 'unpaid'
      });
    }
  }, [invoice, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const invoiceData = {
        ...formData,
        amount: parseFloat(formData.amount) || 0,
        hours_billed: parseFloat(formData.hours_billed) || 0,
        invoice_date: new Date(formData.invoice_date).toISOString(),
        due_date: new Date(formData.due_date).toISOString(),
      };

      if (invoice) {
        // Update existing invoice
        await axios.put(`${API}/invoices/${invoice.id}`, {
          ...invoiceData,
          id: invoice.id
        });
      } else {
        // Create new invoice
        await axios.post(`${API}/invoices`, invoiceData);
      }

      onSave();
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast({
        title: "Error",
        description: "Failed to save invoice",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const calculateAmount = (hours, clientId) => {
    if (hours && clientId) {
      const client = clients.find(c => c.id === clientId);
      if (client && client.hourly_rate) {
        const amount = parseFloat(hours) * client.hourly_rate;
        setFormData(prev => ({
          ...prev,
          amount: amount.toString()
        }));
      }
    }
  };

  useEffect(() => {
    calculateAmount(formData.hours_billed, formData.client_id);
  }, [formData.hours_billed, formData.client_id, clients]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {invoice ? 'Edit Invoice' : 'Add New Invoice'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="client_id">Client *</Label>
              <Select value={formData.client_id} onValueChange={(value) => handleChange('client_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} (${client.hourly_rate}/hr)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hours_billed">Hours Billed *</Label>
                <Input
                  id="hours_billed"
                  type="number"
                  step="0.25"
                  min="0"
                  value={formData.hours_billed}
                  onChange={(e) => handleChange('hours_billed', e.target.value)}
                  placeholder="40.0"
                  required
                />
              </div>

              <div>
                <Label htmlFor="amount">Amount ({currency}) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => handleChange('amount', e.target.value)}
                  placeholder="6000.00"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoice_date">Invoice Date *</Label>
                <Input
                  id="invoice_date"
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => handleChange('invoice_date', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="due_date">Due Date *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => handleChange('due_date', e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                invoice ? 'Update Invoice' : 'Create Invoice'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceFormModal;
