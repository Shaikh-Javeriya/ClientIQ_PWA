import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useToast } from './ui/use-toast';
import { useCurrency } from "./CurrencyContext";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ClientFormModal = ({ client, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    tier: '',
    region: '',
    contact_email: '',
    contact_phone: '',
    hourly_rate: ''
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
    if (client) {
      setFormData({
        name: client.name || client.client_name || '',
        tier: client.tier || '',
        region: client.region || '',
        contact_email: client.contact_email || '',
        contact_phone: client.contact_phone || '',
        hourly_rate: client.hourly_rate?.toString() || ''
      });
    } else {
      setFormData({
        name: '',
        tier: '',
        region: '',
        contact_email: '',
        contact_phone: '',
        hourly_rate: ''
      });
    }
  }, [client, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const clientData = {
        ...formData,
        hourly_rate: parseFloat(formData.hourly_rate) || 0
      };

      if (client) {
        // Update existing client
        await axios.put(`${API}/clients/${client.id || client.client_id}`, {
          ...clientData,
          id: client.id || client.client_id
        });
      } else {
        // Create new client
        await axios.post(`${API}/clients`, clientData);
      }

      onSave();
    } catch (error) {
      console.error('Error saving client:', error);
      toast({
        title: "Error",
        description: "Failed to save client",
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {client ? 'Edit Client' : 'Add New Client'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="name">Client Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter client name"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tier">Tier *</Label>
                <Select value={formData.tier} onValueChange={(value) => handleChange('tier', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Enterprise">Enterprise</SelectItem>
                    <SelectItem value="SMB">SMB</SelectItem>
                    <SelectItem value="Freelance">Freelance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="region">Region *</Label>
                <Input
                  id="region"
                  value={formData.region}
                  onChange={(e) => handleChange('region', e.target.value)}
                  placeholder="e.g. North America, Europe, Asia Pacific"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleChange('contact_email', e.target.value)}
                placeholder="client@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => handleChange('contact_phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <Label htmlFor="hourly_rate">Hourly Rate ({currency}) *</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.hourly_rate}
                  onChange={(e) => handleChange('hourly_rate', e.target.value)}
                  placeholder="150.00"
                  required
                />
              </div>
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
                client ? 'Update Client' : 'Create Client'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientFormModal;
