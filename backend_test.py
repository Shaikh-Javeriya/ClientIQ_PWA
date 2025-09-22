import requests
import sys
import json
from datetime import datetime

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

def main():
    print("🚀 Starting Client Profitability Dashboard API Tests")
    print("=" * 60)
    
    # Setup
    tester = ClientProfitabilityAPITester()
    test_email = f"test_user_{datetime.now().strftime('%H%M%S')}@example.com"
    test_password = "TestPass123!"
    test_name = "Test User"

    # Test sequence
    tests_to_run = [
        ("Root Endpoint", lambda: tester.test_root_endpoint()),
        ("User Registration", lambda: tester.test_register(test_email, test_password, test_name)),
        ("Generate Sample Data", lambda: tester.test_generate_sample_data()),
        ("Get KPIs", lambda: tester.test_get_kpis()),
        ("Get Client Profitability", lambda: tester.test_get_client_profitability()),
        ("Get Revenue by Month", lambda: tester.test_get_revenue_by_month()),
        ("Unauthorized Access", lambda: tester.test_unauthorized_access()),
    ]

    # Run tests
    failed_tests = []
    for test_name, test_func in tests_to_run:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
            failed_tests.append(test_name)

    # Test login with existing user
    print(f"\n🔍 Testing Login with existing user...")
    if not tester.test_login(test_email, test_password):
        failed_tests.append("User Login")

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