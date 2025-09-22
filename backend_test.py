import requests
import sys
import json
from datetime import datetime, timedelta

class ClientProfitabilityAPITester:
    def __init__(self, base_url="https://profitpulse-4.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.user_data = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 500:
                        print(f"   Response: {response_data}")
                    elif isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )
        return success

    def test_register(self, email, password, name):
        """Test user registration"""
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={"email": email, "password": password, "name": name}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response.get('user', {})
            print(f"   Registered user: {self.user_data.get('name', 'Unknown')}")
            return True
        return False

    def test_login(self, email, password):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response.get('user', {})
            print(f"   Logged in user: {self.user_data.get('name', 'Unknown')}")
            return True
        return False

    def test_generate_sample_data(self):
        """Test sample data generation"""
        success, response = self.run_test(
            "Generate Sample Data",
            "POST",
            "data/generate-sample",
            200
        )
        return success

    def test_get_kpis(self):
        """Test KPI endpoint"""
        success, response = self.run_test(
            "Get KPIs",
            "GET",
            "dashboard/kpis",
            200
        )
        if success:
            expected_fields = ['total_revenue', 'gross_profit', 'gross_margin_percent', 
                             'outstanding_ar', 'days_sales_outstanding', 'billable_hours']
            missing_fields = [field for field in expected_fields if field not in response]
            if missing_fields:
                print(f"   ⚠️  Missing KPI fields: {missing_fields}")
            else:
                print(f"   ✅ All KPI fields present")
                print(f"   Total Revenue: ${response.get('total_revenue', 0):,.2f}")
                print(f"   Gross Profit: ${response.get('gross_profit', 0):,.2f}")
                print(f"   Margin: {response.get('gross_margin_percent', 0):.1f}%")
        return success

    def test_get_client_profitability(self):
        """Test client profitability endpoint"""
        success, response = self.run_test(
            "Get Client Profitability",
            "GET",
            "dashboard/client-profitability",
            200
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} clients")
            if response:
                client = response[0]
                expected_fields = ['client_id', 'client_name', 'tier', 'region', 
                                 'revenue', 'hours_worked', 'profit', 'margin_percent']
                missing_fields = [field for field in expected_fields if field not in client]
                if missing_fields:
                    print(f"   ⚠️  Missing client fields: {missing_fields}")
                else:
                    print(f"   ✅ All client fields present")
                    print(f"   Top client: {client.get('client_name', 'Unknown')} - ${client.get('revenue', 0):,.2f}")
        return success

    def test_get_revenue_by_month(self):
        """Test revenue by month endpoint"""
        success, response = self.run_test(
            "Get Revenue by Month",
            "GET",
            "dashboard/revenue-by-month",
            200
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} months of data")
            if response:
                month_data = response[0]
                expected_fields = ['month', 'revenue', 'profit']
                missing_fields = [field for field in expected_fields if field not in month_data]
                if missing_fields:
                    print(f"   ⚠️  Missing month fields: {missing_fields}")
                else:
                    print(f"   ✅ All month fields present")
        return success

    def test_unauthorized_access(self):
        """Test that protected endpoints require authentication"""
        original_token = self.token
        self.token = None  # Remove token temporarily
        
        success, _ = self.run_test(
            "Unauthorized KPI Access",
            "GET",
            "dashboard/kpis",
            401  # Should return 401 Unauthorized
        )
        
        self.token = original_token  # Restore token
        return success

    # NEW ENDPOINTS TESTING
    def test_get_clients(self):
        """Test get all clients endpoint"""
        success, response = self.run_test(
            "Get All Clients",
            "GET",
            "clients",
            200
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} clients")
            if response:
                client = response[0]
                expected_fields = ['id', 'name', 'tier', 'region', 'hourly_rate']
                missing_fields = [field for field in expected_fields if field not in client]
                if missing_fields:
                    print(f"   ⚠️  Missing client fields: {missing_fields}")
                else:
                    print(f"   ✅ All client fields present")
                    print(f"   Sample client: {client.get('name', 'Unknown')} - {client.get('tier', 'Unknown')} tier")
        return success, response

    def test_create_client(self):
        """Test create new client endpoint"""
        test_client = {
            "name": "Test Client Corp",
            "tier": "Enterprise",
            "region": "North America",
            "contact_email": "test@testclient.com",
            "contact_phone": "+1-555-0123",
            "hourly_rate": 150.0
        }
        
        success, response = self.run_test(
            "Create New Client",
            "POST",
            "clients",
            200,
            data=test_client
        )
        
        if success:
            print(f"   ✅ Created client: {response.get('name', 'Unknown')}")
            return success, response.get('id')
        return success, None

    def test_update_client(self, client_id):
        """Test update client endpoint"""
        if not client_id:
            print("   ⚠️  No client ID provided for update test")
            return False
            
        updated_client = {
            "id": client_id,
            "name": "Updated Test Client Corp",
            "tier": "SMB",
            "region": "Europe",
            "contact_email": "updated@testclient.com",
            "contact_phone": "+44-555-0123",
            "hourly_rate": 175.0
        }
        
        success, response = self.run_test(
            "Update Client",
            "PUT",
            f"clients/{client_id}",
            200,
            data=updated_client
        )
        
        if success:
            print(f"   ✅ Updated client: {response.get('name', 'Unknown')}")
        return success

    def test_delete_client(self, client_id):
        """Test delete client endpoint"""
        if not client_id:
            print("   ⚠️  No client ID provided for delete test")
            return False
            
        success, response = self.run_test(
            "Delete Client",
            "DELETE",
            f"clients/{client_id}",
            200
        )
        
        if success:
            print(f"   ✅ Deleted client successfully")
        return success

    def test_get_invoices(self):
        """Test get all invoices endpoint"""
        success, response = self.run_test(
            "Get All Invoices",
            "GET",
            "invoices",
            200
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} invoices")
            if response:
                invoice = response[0]
                expected_fields = ['id', 'client_id', 'amount', 'hours_billed', 'status', 'invoice_date', 'due_date']
                missing_fields = [field for field in expected_fields if field not in invoice]
                if missing_fields:
                    print(f"   ⚠️  Missing invoice fields: {missing_fields}")
                else:
                    print(f"   ✅ All invoice fields present")
                    print(f"   Sample invoice: ${invoice.get('amount', 0):,.2f} - {invoice.get('status', 'Unknown')}")
        return success, response

    def test_create_invoice(self, client_id):
        """Test create new invoice endpoint"""
        if not client_id:
            print("   ⚠️  No client ID provided for invoice creation")
            return False, None
            
        test_invoice = {
            "client_id": client_id,
            "amount": 2500.0,
            "hours_billed": 25.0,
            "invoice_date": datetime.now().isoformat(),
            "due_date": (datetime.now() + timedelta(days=30)).isoformat(),
            "status": "unpaid"
        }
        
        success, response = self.run_test(
            "Create New Invoice",
            "POST",
            "invoices",
            200,
            data=test_invoice
        )
        
        if success:
            print(f"   ✅ Created invoice: ${response.get('amount', 0):,.2f}")
            return success, response.get('id')
        return success, None

    def test_update_invoice(self, invoice_id):
        """Test update invoice endpoint"""
        if not invoice_id:
            print("   ⚠️  No invoice ID provided for update test")
            return False
            
        updated_invoice = {
            "id": invoice_id,
            "client_id": "test-client-id",
            "amount": 3000.0,
            "hours_billed": 30.0,
            "invoice_date": datetime.now().isoformat(),
            "due_date": (datetime.now() + timedelta(days=30)).isoformat(),
            "status": "unpaid"
        }
        
        success, response = self.run_test(
            "Update Invoice",
            "PUT",
            f"invoices/{invoice_id}",
            200,
            data=updated_invoice
        )
        
        if success:
            print(f"   ✅ Updated invoice: ${response.get('amount', 0):,.2f}")
        return success

    def test_mark_invoice_paid(self, invoice_id):
        """Test mark invoice as paid endpoint"""
        if not invoice_id:
            print("   ⚠️  No invoice ID provided for mark paid test")
            return False
            
        success, response = self.run_test(
            "Mark Invoice as Paid",
            "PUT",
            f"invoices/{invoice_id}/mark-paid",
            200
        )
        
        if success:
            print(f"   ✅ Marked invoice as paid")
        return success

    def test_delete_invoice(self, invoice_id):
        """Test delete invoice endpoint"""
        if not invoice_id:
            print("   ⚠️  No invoice ID provided for delete test")
            return False
            
        success, response = self.run_test(
            "Delete Invoice",
            "DELETE",
            f"invoices/{invoice_id}",
            200
        )
        
        if success:
            print(f"   ✅ Deleted invoice successfully")
        return success

    def test_get_ar_aging(self):
        """Test AR aging endpoint"""
        success, response = self.run_test(
            "Get AR Aging Data",
            "GET",
            "invoices/ar-aging",
            200
        )
        if success and isinstance(response, dict):
            expected_buckets = ['0-30', '31-60', '61-90', '90+']
            missing_buckets = [bucket for bucket in expected_buckets if bucket not in response]
            if missing_buckets:
                print(f"   ⚠️  Missing AR aging buckets: {missing_buckets}")
            else:
                print(f"   ✅ All AR aging buckets present")
                total_ar = sum(response.values())
                print(f"   Total Outstanding AR: ${total_ar:,.2f}")
                for bucket, amount in response.items():
                    print(f"   {bucket} days: ${amount:,.2f}")
        return success

    # NEW PROJECT ENDPOINTS TESTING
    def test_get_projects(self):
        """Test get all projects endpoint"""
        success, response = self.run_test(
            "Get All Projects",
            "GET",
            "projects",
            200
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} projects")
            if response:
                project = response[0]
                expected_fields = ['id', 'client_id', 'name', 'hourly_rate', 'hours_worked']
                missing_fields = [field for field in expected_fields if field not in project]
                if missing_fields:
                    print(f"   ⚠️  Missing project fields: {missing_fields}")
                else:
                    print(f"   ✅ All project fields present")
                    print(f"   Sample project: {project.get('name', 'Unknown')} - {project.get('hours_worked', 0)} hours")
        return success, response

    def test_create_project(self, client_id):
        """Test create new project endpoint"""
        if not client_id:
            print("   ⚠️  No client ID provided for project creation")
            return False, None
            
        test_project = {
            "client_id": client_id,
            "name": "Test Project Alpha",
            "description": "A comprehensive test project for API validation",
            "hourly_rate": 125.0,
            "hours_worked": 40.0,
            "status": "active",
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=90)).isoformat()
        }
        
        success, response = self.run_test(
            "Create New Project",
            "POST",
            "projects",
            200,
            data=test_project
        )
        
        if success:
            print(f"   ✅ Created project: {response.get('name', 'Unknown')}")
            return success, response.get('id')
        return success, None

    def test_update_project(self, project_id):
        """Test update project endpoint"""
        if not project_id:
            print("   ⚠️  No project ID provided for update test")
            return False
            
        updated_project = {
            "client_id": "test-client-id",
            "name": "Updated Test Project Alpha",
            "description": "Updated comprehensive test project",
            "hourly_rate": 150.0,
            "hours_worked": 60.0,
            "status": "completed",
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=120)).isoformat()
        }
        
        success, response = self.run_test(
            "Update Project",
            "PUT",
            f"projects/{project_id}",
            200,
            data=updated_project
        )
        
        if success:
            print(f"   ✅ Updated project: {response.get('name', 'Unknown')}")
        return success

    def test_delete_project(self, project_id):
        """Test delete project endpoint"""
        if not project_id:
            print("   ⚠️  No project ID provided for delete test")
            return False
            
        success, response = self.run_test(
            "Delete Project",
            "DELETE",
            f"projects/{project_id}",
            200
        )
        
        if success:
            print(f"   ✅ Deleted project successfully")
        return success

    def test_get_client_details(self, client_id):
        """Test client details endpoint for drillthrough page"""
        if not client_id:
            print("   ⚠️  No client ID provided for client details test")
            return False
            
        success, response = self.run_test(
            "Get Client Details",
            "GET",
            f"clients/{client_id}/details",
            200
        )
        
        if success and isinstance(response, dict):
            expected_sections = ['client', 'projects', 'invoices', 'summary']
            missing_sections = [section for section in expected_sections if section not in response]
            if missing_sections:
                print(f"   ⚠️  Missing client details sections: {missing_sections}")
            else:
                print(f"   ✅ All client details sections present")
                
                # Check client info
                client_info = response.get('client', {})
                print(f"   Client: {client_info.get('name', 'Unknown')}")
                
                # Check projects
                projects = response.get('projects', [])
                print(f"   Projects: {len(projects)} found")
                
                # Check invoices
                invoices = response.get('invoices', [])
                print(f"   Invoices: {len(invoices)} found")
                
                # Check summary
                summary = response.get('summary', {})
                expected_summary_fields = ['total_revenue', 'total_hours', 'outstanding_ar', 'profit', 'margin_percent']
                missing_summary_fields = [field for field in expected_summary_fields if field not in summary]
                if missing_summary_fields:
                    print(f"   ⚠️  Missing summary fields: {missing_summary_fields}")
                else:
                    print(f"   ✅ All summary fields present")
                    print(f"   Revenue: ${summary.get('total_revenue', 0):,.2f}")
                    print(f"   Profit: ${summary.get('profit', 0):,.2f}")
                    print(f"   Margin: {summary.get('margin_percent', 0):.1f}%")
        
        return success

def main():
    print("🚀 Starting Client Profitability Dashboard API Tests")
    print("=" * 60)
    
    # Setup
    tester = ClientProfitabilityAPITester()
    
    # Try to login with existing test user first
    existing_email = "john.doe.test@example.com"
    existing_password = "TestPassword123!"
    
    print(f"\n🔍 Testing Login with existing user: {existing_email}")
    login_success = tester.test_login(existing_email, existing_password)
    
    if not login_success:
        # If existing user login fails, create a new test user
        test_email = f"test_user_{datetime.now().strftime('%H%M%S')}@example.com"
        test_password = "TestPass123!"
        test_name = "Test User"
        print(f"\n🔍 Creating new test user: {test_email}")
        if not tester.test_register(test_email, test_password, test_name):
            print("❌ Failed to create test user, stopping tests")
            return 1

    # Test basic dashboard endpoints
    basic_tests = [
        ("Root Endpoint", lambda: tester.test_root_endpoint()),
        ("Generate Sample Data", lambda: tester.test_generate_sample_data()),
        ("Get KPIs", lambda: tester.test_get_kpis()),
        ("Get Client Profitability", lambda: tester.test_get_client_profitability()),
        ("Get Revenue by Month", lambda: tester.test_get_revenue_by_month()),
    ]

    failed_tests = []
    for test_name, test_func in basic_tests:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
            failed_tests.append(test_name)

    # Test new Clients endpoints
    print(f"\n{'='*60}")
    print("🏢 TESTING CLIENTS ENDPOINTS")
    print(f"{'='*60}")
    
    client_id = None
    try:
        # Get existing clients
        success, clients = tester.test_get_clients()
        if not success:
            failed_tests.append("Get Clients")
        
        # Create new client
        success, new_client_id = tester.test_create_client()
        if success:
            client_id = new_client_id
        else:
            failed_tests.append("Create Client")
        
        # Update client (if we have an ID)
        if client_id:
            if not tester.test_update_client(client_id):
                failed_tests.append("Update Client")
        
    except Exception as e:
        print(f"❌ Clients testing - Exception: {str(e)}")
        failed_tests.append("Clients CRUD")

    # Test new Invoices endpoints
    print(f"\n{'='*60}")
    print("📄 TESTING INVOICES ENDPOINTS")
    print(f"{'='*60}")
    
    invoice_id = None
    try:
        # Get existing invoices
        success, invoices = tester.test_get_invoices()
        if not success:
            failed_tests.append("Get Invoices")
        
        # Use existing client or create one for invoice testing
        test_client_id = client_id
        if not test_client_id and invoices:
            test_client_id = invoices[0].get('client_id')
        
        # Create new invoice
        if test_client_id:
            success, new_invoice_id = tester.test_create_invoice(test_client_id)
            if success:
                invoice_id = new_invoice_id
            else:
                failed_tests.append("Create Invoice")
        
        # Update invoice (if we have an ID)
        if invoice_id:
            if not tester.test_update_invoice(invoice_id):
                failed_tests.append("Update Invoice")
            
            # Mark invoice as paid
            if not tester.test_mark_invoice_paid(invoice_id):
                failed_tests.append("Mark Invoice Paid")
        
        # Test AR aging
        if not tester.test_get_ar_aging():
            failed_tests.append("Get AR Aging")
        
    except Exception as e:
        print(f"❌ Invoices testing - Exception: {str(e)}")
        failed_tests.append("Invoices CRUD")

    # Test cleanup - delete created resources
    print(f"\n{'='*60}")
    print("🧹 CLEANUP - DELETING TEST DATA")
    print(f"{'='*60}")
    
    try:
        # Delete test invoice
        if invoice_id:
            if not tester.test_delete_invoice(invoice_id):
                failed_tests.append("Delete Invoice")
        
        # Delete test client
        if client_id:
            if not tester.test_delete_client(client_id):
                failed_tests.append("Delete Client")
                
    except Exception as e:
        print(f"❌ Cleanup - Exception: {str(e)}")

    # Test unauthorized access
    try:
        if not tester.test_unauthorized_access():
            failed_tests.append("Unauthorized Access")
    except Exception as e:
        print(f"❌ Unauthorized Access - Exception: {str(e)}")
        failed_tests.append("Unauthorized Access")

    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    if failed_tests:
        print(f"❌ Failed tests: {', '.join(failed_tests)}")
        return 1
    else:
        print("✅ All tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())