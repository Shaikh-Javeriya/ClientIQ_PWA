import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  DollarSign, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Check,
  Mail,
  Edit,
  Trash2,
  Upload,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import InvoicesTable from './InvoicesTable';
import InvoicesCharts from './InvoicesCharts';
import InvoiceFormModal from './InvoiceFormModal';
import { useToast } from './ui/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const InvoicesPage = ({ user }) => {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [arAging, setArAging] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invoicesResponse, clientsResponse, arAgingResponse] = await Promise.all([
        axios.get(`${API}/invoices`),
        axios.get(`${API}/clients`),
        axios.get(`${API}/invoices/ar-aging`)
      ]);
      
      // Enrich invoices with client names
      const invoicesWithClients = invoicesResponse.data.map(invoice => {
        const client = clientsResponse.data.find(c => c.id === invoice.client_id);
        return {
          ...invoice,
          client_name: client?.name || 'Unknown Client',
          days_overdue: invoice.status === 'overdue' ? 
            Math.max(0, Math.floor((new Date() - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24))) : 0
        };
      });
      
      setInvoices(invoicesWithClients);
      setFilteredInvoices(invoicesWithClients);
      setClients(clientsResponse.data);
      setArAging(arAgingResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load invoices data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [invoices, searchTerm, clientFilter, statusFilter]);

  const applyFilters = () => {
    let filtered = [...invoices];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(invoice =>
        invoice.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Client filter
    if (clientFilter && clientFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.client_id === clientFilter);
    }

    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter);
    }

    setFilteredInvoices(filtered);
  };

  const handleCreateInvoice = () => {
    setSelectedInvoice(null);
    setShowInvoiceModal(true);
  };

  const handleEditInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) {
      return;
    }

    try {
      await axios.delete(`${API}/invoices/${invoiceId}`);
      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      });
      fetchData();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast({
        title: "Error",
        description: "Failed to delete invoice",
        variant: "destructive",
      });
    }
  };

  const handleMarkPaid = async (invoiceId) => {
    try {
      await axios.put(`${API}/invoices/${invoiceId}/mark-paid`);
      toast({
        title: "Success",
        description: "Invoice marked as paid",
      });
      fetchData();
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      toast({
        title: "Error",
        description: "Failed to mark invoice as paid",
        variant: "destructive",
      });
    }
  };

  const handleSendReminder = (invoice) => {
    // Copy email template to clipboard
    const emailTemplate = `Subject: Payment Reminder - Invoice ${invoice.id?.slice(-8) || 'Pending'}

Dear ${invoice.client_name},

We hope this message finds you well. We wanted to reach out regarding the outstanding invoice details below:

Invoice Amount: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(invoice.amount || 0)}
Due Date: ${new Date(invoice.due_date).toLocaleDateString()}
Days Overdue: ${invoice.days_overdue || 0} days

Please review and process payment at your earliest convenience.

Best regards,
Your Account Team`;

    navigator.clipboard.writeText(emailTemplate).then(() => {
      toast({
        title: "Email Template Copied",
        description: `Payment reminder email template copied to clipboard for invoice ${invoice.id?.slice(-8) || 'N/A'}`,
      });
    }).catch(() => {
      toast({
        title: "Email Template Ready",
        description: `Payment reminder template prepared for invoice ${invoice.id?.slice(-8) || 'N/A'}`,
      });
    });
  };

  const downloadCSVTemplate = () => {
    const csvTemplate = `client_name,amount,hours_billed,invoice_date,due_date,status
"TechCorp Solutions",6000,40,"2024-01-15","2024-02-14","paid"
"Digital Marketing Pro",4500,30,"2024-02-01","2024-03-03","unpaid"
"StartupXYZ",7200,48,"2024-02-15","2024-03-17","overdue"`;

    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invoices-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Template Downloaded",
      description: "CSV template downloaded. Fill it out and import your invoices.",
    });
  };

  const handleImportCSV = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    toast({
      title: "Processing CSV",
      description: "Reading and importing invoice data...",
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
        
        // Expected headers: client_name_or_id, amount, hours_billed, invoice_date, due_date, status
        let importedCount = 0;
        let errorCount = 0;
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          if (values.length < 4) {
            errorCount++;
            continue;
          }
          
          // Find client by name or ID
          let clientId = values[0];
          if (!clientId || !clientId.includes('-')) {
            // Try to find client by name
            const clientName = values[0];
            const client = clients.find(c => 
              c.name?.toLowerCase().includes(clientName.toLowerCase()) ||
              c.client_name?.toLowerCase().includes(clientName.toLowerCase())
            );
            clientId = client ? client.id : '';
          }
          
          if (!clientId) {
            errorCount++;
            continue;
          }
          
          const invoiceData = {
            client_id: clientId,
            amount: parseFloat(values[1]) || 0,
            hours_billed: parseFloat(values[2]) || 0,
            invoice_date: values[3] || new Date().toISOString(),
            due_date: values[4] || new Date(Date.now() + 30*24*60*60*1000).toISOString(),
            status: values[5] || 'unpaid'
          };
          
          try {
            await axios.post(`${API}/invoices`, invoiceData);
            importedCount++;
          } catch (error) {
            console.error('Error importing invoice:', error);
            errorCount++;
          }
        }
        
        if (importedCount > 0) {
          await fetchData();
          toast({
            title: "Import Successful",
            description: `Imported ${importedCount} invoices successfully${errorCount > 0 ? `. ${errorCount} rows had errors.` : '.'}`,
          });
        } else {
          toast({
            title: "Import Failed",
            description: "No invoices could be imported. Please check your CSV format and client names.",
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

  const handleInvoiceSaved = () => {
    setShowInvoiceModal(false);
    fetchData();
    toast({
      title: "Success",
      description: selectedInvoice ? "Invoice updated successfully" : "Invoice created successfully",
    });
  };

  // Calculate overdue alerts
  const overdueInvoices = filteredInvoices.filter(inv => inv.status === 'overdue');
  const criticalOverdue = overdueInvoices.filter(inv => inv.days_overdue > 30);

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Invoices & AR</h1>
          <p className="text-gray-600">Manage invoices and track accounts receivable</p>
        </div>
        <Button onClick={handleCreateInvoice} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Invoice
        </Button>
      </div>

      {/* Alerts */}
      {criticalOverdue.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-800">Critical Overdue Alerts</h3>
                <p className="text-red-700">
                  {criticalOverdue.length} invoice{criticalOverdue.length > 1 ? 's' : ''} overdue by more than 30 days
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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

            <div className="flex items-center space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                className="flex items-center space-x-2"
                onClick={() => document.getElementById('csv-upload-invoices').click()}
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
                id="csv-upload-invoices"
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
      <InvoicesCharts invoices={filteredInvoices} arAging={arAging} />

      {/* Invoices Table */}
      <Card className="chart-container">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5" />
            <span>Invoices ({filteredInvoices.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InvoicesTable 
            invoices={filteredInvoices}
            onEdit={handleEditInvoice}
            onDelete={handleDeleteInvoice}
            onMarkPaid={handleMarkPaid}
            onSendReminder={handleSendReminder}
          />
        </CardContent>
      </Card>

      {/* Invoice Form Modal */}
      {showInvoiceModal && (
        <InvoiceFormModal
          invoice={selectedInvoice}
          clients={clients}
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          onSave={handleInvoiceSaved}
        />
      )}
    </div>
  );
};

export default InvoicesPage;
