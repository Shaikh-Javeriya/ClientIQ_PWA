import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Users,
  Search,
  Filter,
  Plus,
  Eye,
  Download,
  Mail,
  Edit,
  Trash2,
  Upload
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import ClientsTable from './ClientsTable';
import ClientsCharts from './ClientsCharts';
import ClientFormModal from './ClientFormModal';
import { useToast } from './ui/use-toast';
import { useCurrency } from "./CurrencyContext";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ClientsPage = ({ user }) => {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [marginFilter, setMarginFilter] = useState('all');
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
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

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/clients`);
      const clientsData = response.data;

      // Fetch profitability data for each client
      const profitabilityResponse = await axios.get(`${API}/dashboard/client-profitability`);
      const profitabilityData = profitabilityResponse.data;

      // Merge client data with profitability data
      const enrichedClients = clientsData.map(client => {
        const profitability = profitabilityData.find(p => p.client_id === client.id);
        return {
          ...client,
          ...profitability
        };
      });

      setClients(enrichedClients);
      setFilteredClients(enrichedClients);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Error",
        description: "Failed to load clients data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [clients, searchTerm, tierFilter, regionFilter, marginFilter]);

  const applyFilters = () => {
    let filtered = [...clients];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(client =>
        client.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Tier filter
    if (tierFilter && tierFilter !== 'all') {
      filtered = filtered.filter(client => client.tier === tierFilter);
    }

    // Region filter
    if (regionFilter && regionFilter !== 'all') {
      filtered = filtered.filter(client => client.region === regionFilter);
    }

    // Margin filter
    if (marginFilter && marginFilter !== 'all') {
      filtered = filtered.filter(client => {
        const margin = client.margin_percent || 0;
        switch (marginFilter) {
          case 'high':
            return margin >= 30;
          case 'medium':
            return margin >= 15 && margin < 30;
          case 'low':
            return margin < 15;
          default:
            return true;
        }
      });
    }

    setFilteredClients(filtered);
  };

  const handleCreateClient = () => {
    setSelectedClient(null);
    setShowClientModal(true);
  };

  const handleEditClient = (client) => {
    setSelectedClient(client);
    setShowClientModal(true);
  };

  const handleDeleteClient = async (clientId) => {
    if (!window.confirm('Are you sure you want to delete this client? This will also delete all associated projects and invoices.')) {
      return;
    }

    try {
      await axios.delete(`${API}/clients/${clientId}`);
      toast({
        title: "Success",
        description: "Client deleted successfully",
      });
      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: "Error",
        description: "Failed to delete client",
        variant: "destructive",
      });
    }
  };

  const handleClientSaved = () => {
    setShowClientModal(false);
    fetchClients();
    toast({
      title: "Success",
      description: selectedClient ? "Client updated successfully" : "Client created successfully",
    });
  };

  const handleExportClient = (client) => {
    const csvContent = [
      ['Field', 'Value'],
      ['Client ID', client.id || client.client_id],
      ['Client Name', client.client_name || client.name],
      ['Tier', client.tier],
      ['Region', client.region],
      ['Revenue', client.revenue || 0],
      ['Profit', client.profit || 0],
      ['Margin %', client.margin_percent || 0],
      ['Profit/Hour', client.profit_per_hour || 0],
      ['Outstanding AR', client.outstanding_ar || 0],
      ['Last Invoice Date', client.last_invoice_date || 'N/A']
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `client-${client.client_name || client.name}-export.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Client data exported successfully",
    });
  };

  const handleSendReminder = (client) => {
    // Copy email template to clipboard
    const emailTemplate = `Subject: Payment Reminder - Outstanding Invoice

Dear ${client.client_name || client.name},

We hope this message finds you well. We wanted to reach out regarding outstanding invoices totaling ${formatCurrency(client.outstanding_ar || 0)}.

Please review your account and process payment at your earliest convenience.

Best regards,
Your Account Team`;

    navigator.clipboard.writeText(emailTemplate).then(() => {
      toast({
        title: "Email Template Copied",
        description: `Payment reminder email template copied to clipboard for ${client.client_name || client.name}`,
      });
    }).catch(() => {
      toast({
        title: "Email Template Ready",
        description: `Payment reminder template prepared for ${client.client_name || client.name}`,
      });
    });
  };

  const downloadCSVTemplate = () => {
    const csvTemplate = `id,name,tier,region,contact_email,contact_phone,hourly_rate
"sample-uuid-1234","Sample Client 1",SMB,"North America","client1@example.com","+1-555-123-4567",120
"sample-uuid-5678","Sample Client 2",Enterprise,"Europe","client2@example.com","+44-20-1234-5678",180
"sample-uuid-9012","Sample Client 3",Freelance,"Asia Pacific","client3@example.com","+81-3-1234-5678",95`;

    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clients-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Template Downloaded",
      description: "CSV template downloaded. Fill it out and import your clients.",
    });
  };


  const handleImportCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    toast({
      title: "Processing CSV",
      description: "Reading and importing client data...",
    });

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n').filter(line => line.trim());

        if (lines.length <= 1) {
          toast({
            title: "Import Error",
            description: "CSV file appears to be empty or contains only headers",
            variant: "destructive",
          });
          return;
        }

        // Expected headers: name, tier, region, contact_email, contact_phone, hourly_rate
        let importedCount = 0;
        let errorCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          if (values.length < 3) {
            errorCount++;
            continue;
          }

          const clientData = {
            name: values[0] || `Client ${i}`,
            tier: values[1] || 'SMB',
            region: values[2] || 'North America',
            contact_email: values[3] || '',
            contact_phone: values[4] || '',
            hourly_rate: parseFloat(values[5]) || 100
          };

          try {
            await axios.post(`${API}/clients`, clientData);
            importedCount++;
          } catch (error) {
            console.error('Error importing client:', error);
            errorCount++;
          }
        }

        if (importedCount > 0) {
          await fetchClients();
          toast({
            title: "Import Successful",
            description: `Imported ${importedCount} clients successfully${errorCount > 0 ? `. ${errorCount} rows had errors.` : '.'}`,
          });
        } else {
          toast({
            title: "Import Failed",
            description: "No clients could be imported. Please check your CSV format.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast({
          title: "Import Error",
          description: "Failed to parse CSV file. Please check the format.",
          variant: "destructive",
        });
      }
    };

    reader.readAsText(file);
    event.target.value = ''; // Reset file input
  };

  const getUniqueValues = (field) => {
    const values = clients.map(client => client[field]).filter(Boolean);
    return [...new Set(values)];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Clients</h1>
          <p className="text-gray-600">Manage your clients and analyze their profitability</p>
        </div>
        <Button onClick={handleCreateClient} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Filters and Search */}
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Tiers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="Enterprise">Enterprise</SelectItem>
                <SelectItem value="SMB">SMB</SelectItem>
                <SelectItem value="Freelance">Freelance</SelectItem>
              </SelectContent>
            </Select>

            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {getUniqueValues('region').map(region => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={marginFilter} onValueChange={setMarginFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Margins" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Margins</SelectItem>
                <SelectItem value="high">High (30%+)</SelectItem>
                <SelectItem value="medium">Medium (15-30%)</SelectItem>
                <SelectItem value="low">Low (&lt;15%)</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                className="flex items-center space-x-2"
                onClick={() => document.getElementById('csv-upload-clients').click()}
              >
                <Upload className="w-4 h-4" />
                <span>Import CSV</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={downloadCSVTemplate}
                className="text-xs"
                title="Download CSV Template"
              >
                Template
              </Button>
              <input
                id="csv-upload-clients"
                type="file"
                accept=".csv,.txt"
                onChange={handleImportCSV}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <ClientsCharts clients={filteredClients} />

      {/* Clients Table */}
      <Card className="chart-container">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Client Profitability ({filteredClients.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ClientsTable
            clients={filteredClients}
            onEdit={handleEditClient}
            onDelete={handleDeleteClient}
            onExport={handleExportClient}
            onSendReminder={handleSendReminder}
          />
        </CardContent>
      </Card>

      {/* Client Form Modal */}
      {showClientModal && (
        <ClientFormModal
          client={selectedClient}
          isOpen={showClientModal}
          onClose={() => setShowClientModal(false)}
          onSave={handleClientSaved}
        />
      )}
    </div>
  );
};

export default ClientsPage;
