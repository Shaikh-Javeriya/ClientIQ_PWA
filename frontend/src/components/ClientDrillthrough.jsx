import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Check, 
  Mail,
  DollarSign,
  Clock,
  TrendingUp,
  BarChart3,
  Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import ClientProfileCard from './ClientProfileCard';
import ClientRevenueChart from './ClientRevenueChart';
import ProjectProfitabilityChart from './ProjectProfitabilityChart';
import ClientInvoicesList from './ClientInvoicesList';
import ProjectFormModal from './ProjectFormModal';
import { useToast } from './ui/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ClientDrillthrough = ({ clientId: propClientId, embedded = false }) => {
  const { clientId: paramClientId } = useParams();
  const clientId = propClientId || paramClientId;
  const [clientDetails, setClientDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const { toast } = useToast();

  const fetchClientDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/clients/${clientId}/details`);
      setClientDetails(response.data);
    } catch (error) {
      console.error('Error fetching client details:', error);
      toast({
        title: "Error",
        description: "Failed to load client details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchClientDetails();
    }
  }, [clientId]);

  const handleCreateProject = () => {
    setSelectedProject(null);
    setShowProjectModal(true);
  };

  const handleEditProject = (project) => {
    setSelectedProject(project);
    setShowProjectModal(true);
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project?')) {
      return;
    }

    try {
      await axios.delete(`${API}/projects/${projectId}`);
      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
      fetchClientDetails();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    }
  };

  const handleProjectSaved = () => {
    setShowProjectModal(false);
    fetchClientDetails();
    toast({
      title: "Success",
      description: selectedProject ? "Project updated successfully" : "Project created successfully",
    });
  };

  const handleMarkInvoicePaid = async (invoiceId) => {
    try {
      await axios.put(`${API}/invoices/${invoiceId}/mark-paid`);
      toast({
        title: "Success",
        description: "Invoice marked as paid",
      });
      fetchClientDetails();
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
    const emailTemplate = `Subject: Payment Reminder - Invoice ${invoice.id?.slice(-8) || 'Pending'}

Dear ${clientDetails?.client?.name || 'Client'},

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
        description: `Payment reminder email template copied to clipboard`,
      });
    }).catch(() => {
      toast({
        title: "Email Template Ready",
        description: `Payment reminder template prepared`,
      });
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  if (!clientDetails) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Client not found</p>
        <Link to="/clients" className="text-blue-600 hover:underline mt-4 inline-block">
          Back to Clients
        </Link>
      </div>
    );
  }

  const { client, projects, invoices, summary } = clientDetails;

  return (
    <div className="space-y-8">
      {/* Header */}
      {!embedded && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/clients">
              <Button variant="outline" size="sm" className="flex items-center space-x-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Clients</span>
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
              <p className="text-gray-600">Client Overview & Project Management</p>
            </div>
          </div>
          <Button onClick={handleCreateProject} className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Project
          </Button>
        </div>
      )}

      {/* Embedded Header */}
      {embedded && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{client.name} - Detailed View</h2>
            <p className="text-gray-600">Project Management & Invoice Tracking</p>
          </div>
          <Button onClick={handleCreateProject} className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Project
          </Button>
        </div>
      )}

      {/* Client Profile Card */}
      <ClientProfileCard client={client} summary={summary} />

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue & Profit Trend */}
        <Card className="chart-container">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Revenue & Profit Trend</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ClientRevenueChart data={invoices} />
          </CardContent>
        </Card>

        {/* Project Profitability */}
        <Card className="chart-container">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Project Profitability</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectProfitabilityChart projects={projects} />
          </CardContent>
        </Card>
      </div>

      {/* Projects Table */}
      <Card className="chart-container">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Projects ({projects.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="text-left">Project Name</th>
                  <th className="text-right">Hours Worked</th>
                  <th className="text-right">Hourly Rate</th>
                  <th className="text-right">Revenue</th>
                  <th className="text-right">Profit</th>
                  <th className="text-left">Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => {
                  const revenue = (project.hours_worked || 0) * (project.hourly_rate || 0);
                  const profit = revenue * 0.75;
                  return (
                    <tr key={project.id}>
                      <td className="font-medium text-gray-900">{project.name}</td>
                      <td className="text-right">{(project.hours_worked || 0).toFixed(1)}h</td>
                      <td className="text-right">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(project.hourly_rate || 0)}
                      </td>
                      <td className="text-right font-semibold">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(revenue)}
                      </td>
                      <td className="text-right font-semibold text-green-600">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(profit)}
                      </td>
                      <td>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          project.status === 'active' ? 'bg-green-100 text-green-800' :
                          project.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {project.status || 'active'}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditProject(project)}
                            className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteProject(project.id)}
                            className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Client Invoices */}
      <Card className="chart-container">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5" />
            <span>Invoices ({invoices.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ClientInvoicesList 
            invoices={invoices}
            projects={projects}
            onMarkPaid={handleMarkInvoicePaid}
            onSendReminder={handleSendReminder}
          />
        </CardContent>
      </Card>

      {/* Project Form Modal */}
      {showProjectModal && (
        <ProjectFormModal
          project={selectedProject}
          clientId={clientId}
          isOpen={showProjectModal}
          onClose={() => setShowProjectModal(false)}
          onSave={handleProjectSaved}
        />
      )}
    </div>
  );
};

export default ClientDrillthrough;