import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  Users,
  Search,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import ClientDrillthrough from './ClientDrillthrough';
import { useToast } from './ui/use-toast';
import { useCurrency } from "./CurrencyContext";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ClientDetailsPage = ({ user }) => {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Extract ?id=<clientId> from URL if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const clientIdFromURL = params.get('id');
    if (clientIdFromURL) {
      setSelectedClientId(clientIdFromURL);
    }
  }, [location.search]);

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

      // Auto-select first client if none selected
      if (!selectedClientId && enrichedClients.length > 0) {
        setSelectedClientId(enrichedClients[0].id);
      }
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




  const filteredClients = clients.filter(client =>
    client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const { currency, locale, formatCurrency } = useCurrency();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Client Details</h1>
          <p className="text-gray-600">No clients found. Please add some clients first.</p>
        </div>
        <Card className="glass-card">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Clients Available</h3>
            <p className="text-gray-600 mb-4">Add clients to view detailed information and manage projects.</p>
            <Button onClick={() => navigate('/clients')} className="btn-primary">
              Go to Clients Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Client Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Client Details</h1>
          <p className="text-gray-600">Detailed view and project management for selected client</p>
        </div>

        <div className="flex items-center space-x-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={selectedClientId || ''} onValueChange={setSelectedClientId}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Select a client" />
            </SelectTrigger>
            <SelectContent>
              {filteredClients.map(client => (
                <SelectItem key={client.id} value={client.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{client.name || client.client_name}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      {formatCurrency(client.revenue || 0)}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Client Quick Stats */}
      {selectedClientId && (
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredClients
                .filter(client => client.id === selectedClientId)
                .map(client => (
                  <React.Fragment key={client.id}>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(client.revenue || 0)}
                      </p>
                      <p className="text-sm text-gray-600">Total Revenue</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(client.profit || 0)}
                      </p>
                      <p className="text-sm text-gray-600">Gross Profit</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {(client.margin_percent || 0).toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-600">Profit Margin</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-2xl font-bold ${client.outstanding_ar > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        {formatCurrency(client.outstanding_ar || 0)}
                      </p>
                      <p className="text-sm text-gray-600">Outstanding AR</p>
                    </div>
                  </React.Fragment>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Drillthrough Component */}
      {selectedClientId && (
        <div className="client-drillthrough-container">
          <ClientDrillthrough clientId={selectedClientId} embedded={true} />
        </div>
      )}
    </div>
  );
};

export default ClientDetailsPage;
