#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta

class HotelBookingAPITester:
    def __init__(self, base_url="https://event-payments-3.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f", Expected: {expected_status}"
                try:
                    error_data = response.json()
                    details += f", Response: {error_data}"
                except:
                    details += f", Response: {response.text[:200]}"

            self.log_test(name, success, details)
            return success, response.json() if success and response.content else {}

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_seed_hotels(self):
        """Test seeding hotels"""
        return self.run_test("Seed Hotels", "POST", "seed-hotels", 200)

    def test_get_hotels(self):
        """Test getting hotels list"""
        success, response = self.run_test("Get Hotels", "GET", "hotels", 200)
        if success and isinstance(response, list):
            hotel_count = len(response)
            self.log_test(f"Hotels Count Check (Expected: 4)", hotel_count == 4, f"Found {hotel_count} hotels")
            return success, response
        return success, response

    def test_admin_login(self):
        """Test admin login"""
        login_data = {
            "email": "info@travel-events.de",
            "password": "admin123"
        }
        success, response = self.run_test("Admin Login", "POST", "admin/login", 200, login_data)
        if success and 'token' in response:
            self.admin_token = response['token']
            return True, response
        return False, response

    def test_admin_stats(self):
        """Test admin stats endpoint"""
        if not self.admin_token:
            self.log_test("Admin Stats", False, "No admin token available")
            return False, {}
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        return self.run_test("Admin Stats", "GET", "admin/stats", 200, headers=headers)

    def test_admin_hotels(self):
        """Test admin hotels endpoint"""
        if not self.admin_token:
            self.log_test("Admin Hotels", False, "No admin token available")
            return False, {}
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        return self.run_test("Admin Hotels", "GET", "admin/hotels", 200, headers=headers)

    def test_admin_bookings(self):
        """Test admin bookings endpoint"""
        if not self.admin_token:
            self.log_test("Admin Bookings", False, "No admin token available")
            return False, {}
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        return self.run_test("Admin Bookings", "GET", "admin/bookings", 200, headers=headers)

    def test_create_booking(self):
        """Test creating a booking"""
        # First get a hotel
        success, hotels = self.test_get_hotels()
        if not success or not hotels:
            self.log_test("Create Booking", False, "No hotels available for booking")
            return False, {}

        hotel_id = hotels[0]['id']
        
        # Create booking data
        booking_data = {
            "hotel_id": hotel_id,
            "salutation": "Herr",
            "first_name": "Test",
            "last_name": "User",
            "email": "test@example.com",
            "street": "Test Street 123",
            "postal_code": "12345",
            "city": "Test City",
            "country": "Deutschland",
            "room_type": "single",
            "check_in": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "check_out": (datetime.now() + timedelta(days=33)).strftime("%Y-%m-%d"),
            "notes": "Test booking",
            "language": "de"
        }
        
        success, response = self.run_test("Create Booking", "POST", "bookings", 200, booking_data)
        if success and 'booking' in response:
            return True, response['booking']
        return False, response

    def test_invoice_download(self):
        """Test invoice download"""
        # Create a booking first
        success, booking = self.test_create_booking()
        if not success:
            self.log_test("Invoice Download", False, "Could not create booking for invoice test")
            return False, {}

        booking_id = booking['id']
        
        # Test invoice download
        url = f"{self.base_url}/bookings/{booking_id}/invoice"
        try:
            response = requests.get(url, timeout=10)
            success = response.status_code == 200 and response.headers.get('content-type') == 'application/pdf'
            details = f"Status: {response.status_code}, Content-Type: {response.headers.get('content-type', 'unknown')}"
            self.log_test("Invoice Download", success, details)
            return success, {}
        except Exception as e:
            self.log_test("Invoice Download", False, f"Error: {str(e)}")
            return False, {}

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Hotel Booking API Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)

        # Basic API tests
        self.test_root_endpoint()
        self.test_seed_hotels()
        self.test_get_hotels()
        
        # Admin authentication
        self.test_admin_login()
        
        # Admin endpoints (require authentication)
        self.test_admin_stats()
        self.test_admin_hotels()
        self.test_admin_bookings()
        
        # Booking functionality
        self.test_create_booking()
        self.test_invoice_download()

        # Print summary
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("❌ Some tests failed!")
            failed_tests = [t for t in self.test_results if not t['success']]
            print("\nFailed tests:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
            return 1

def main():
    tester = HotelBookingAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())