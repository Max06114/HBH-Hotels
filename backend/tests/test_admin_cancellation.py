"""
Test suite for Admin Dashboard and Booking Cancellation functionality
Tests: Admin login, bookings management, cancellation with refund logic
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from environment
ADMIN_EMAIL = os.environ.get('TEST_ADMIN_EMAIL', 'info@travel-events.de')
ADMIN_PASSWORD = os.environ.get('TEST_ADMIN_PASSWORD', '')


class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        assert "email" in data, "Email not in response"
        assert data["email"] == ADMIN_EMAIL
        print(f"✓ Admin login successful, token received")
        return data["token"]
    
    def test_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Invalid credentials correctly rejected")
    
    def test_admin_me_endpoint(self):
        """Test /admin/me endpoint with valid token"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_response.json()["token"]
        
        # Test /admin/me
        response = requests.get(
            f"{BASE_URL}/api/admin/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Admin me failed: {response.text}"
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        print(f"✓ Admin me endpoint working")


class TestAdminBookings:
    """Admin bookings management tests"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_admin_bookings(self, auth_headers):
        """Test fetching all bookings as admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/bookings",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Get bookings failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Admin bookings endpoint working, found {len(data)} bookings")
        return data
    
    def test_get_admin_stats(self, auth_headers):
        """Test admin stats endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Get stats failed: {response.text}"
        data = response.json()
        assert "total_bookings" in data
        assert "pending_bookings" in data
        assert "paid_bookings" in data
        assert "cancelled_bookings" in data
        assert "total_revenue" in data
        print(f"✓ Admin stats: {data['total_bookings']} total, {data['cancelled_bookings']} cancelled")
        return data


class TestBookingCancellation:
    """Booking cancellation with refund logic tests"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture
    def test_booking(self, auth_headers):
        """Create a test booking for cancellation tests"""
        # First get a hotel
        hotels_response = requests.get(f"{BASE_URL}/api/hotels")
        hotels = hotels_response.json()
        if not hotels:
            pytest.skip("No hotels available for testing")
        
        hotel = hotels[0]
        
        # Create a booking with check-in 10 days from now (should get 100% refund)
        check_in = (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d")
        check_out = (datetime.now() + timedelta(days=12)).strftime("%Y-%m-%d")
        
        booking_data = {
            "hotel_id": hotel["id"],
            "salutation": "Mr",
            "first_name": "TEST_Cancel",
            "last_name": "User",
            "email": "test_cancel@example.com",
            "street": "Test Street 123",
            "postal_code": "12345",
            "city": "Test City",
            "country": "Germany",
            "room_type": "single",
            "check_in": check_in,
            "check_out": check_out,
            "notes": "Test booking for cancellation",
            "language": "en"
        }
        
        response = requests.post(f"{BASE_URL}/api/bookings", json=booking_data)
        assert response.status_code == 200, f"Create booking failed: {response.text}"
        data = response.json()
        assert "booking" in data
        print(f"✓ Test booking created: {data['booking']['booking_number']}")
        return data["booking"]
    
    def test_cancel_booking_api_exists(self, auth_headers):
        """Test that cancel booking endpoint exists"""
        # Try with a non-existent booking ID to check endpoint exists
        response = requests.post(
            f"{BASE_URL}/api/bookings/non-existent-id/cancel",
            headers=auth_headers
        )
        # Should return 404 (not found) not 405 (method not allowed)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print(f"✓ Cancel booking endpoint exists and returns 404 for non-existent booking")
    
    def test_cancel_booking_requires_auth(self):
        """Test that cancel booking requires authentication"""
        response = requests.post(f"{BASE_URL}/api/bookings/some-id/cancel")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Cancel booking correctly requires authentication")
    
    def test_cancel_booking_success(self, auth_headers, test_booking):
        """Test successful booking cancellation with refund info"""
        booking_id = test_booking["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/bookings/{booking_id}/cancel",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Cancel booking failed: {response.text}"
        
        data = response.json()
        
        # Verify response contains refund information
        assert "message" in data, "Response should contain message"
        assert "booking_id" in data, "Response should contain booking_id"
        assert "refund_amount" in data, "Response should contain refund_amount"
        assert "refund_percentage" in data, "Response should contain refund_percentage"
        assert "refund_status" in data, "Response should contain refund_status"
        
        print(f"✓ Booking cancelled successfully")
        print(f"  - Refund percentage: {data['refund_percentage']}%")
        print(f"  - Refund amount: {data['refund_amount']} EUR")
        print(f"  - Refund status: {data['refund_status']}")
        
        # Since check-in is 10 days away, should get 100% refund
        assert data["refund_percentage"] == 100, f"Expected 100% refund for >7 days, got {data['refund_percentage']}%"
        
        return data
    
    def test_booking_status_after_cancel(self, auth_headers, test_booking):
        """Test that booking status changes to cancelled after cancellation"""
        booking_id = test_booking["id"]
        
        # Cancel the booking
        cancel_response = requests.post(
            f"{BASE_URL}/api/bookings/{booking_id}/cancel",
            headers=auth_headers
        )
        assert cancel_response.status_code == 200
        
        # Verify booking status changed
        get_response = requests.get(
            f"{BASE_URL}/api/admin/bookings/{booking_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 200, f"Get booking failed: {get_response.text}"
        
        booking = get_response.json()
        assert booking["payment_status"] == "cancelled", f"Expected 'cancelled', got '{booking['payment_status']}'"
        print(f"✓ Booking status correctly changed to 'cancelled'")


class TestRefundPolicyCalculation:
    """Test refund percentage calculation based on cancellation policy"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def create_booking_with_checkin_days(self, days_from_now):
        """Helper to create booking with specific check-in date"""
        hotels_response = requests.get(f"{BASE_URL}/api/hotels")
        hotels = hotels_response.json()
        if not hotels:
            pytest.skip("No hotels available")
        
        hotel = hotels[0]
        check_in = (datetime.now() + timedelta(days=days_from_now)).strftime("%Y-%m-%d")
        check_out = (datetime.now() + timedelta(days=days_from_now + 2)).strftime("%Y-%m-%d")
        
        booking_data = {
            "hotel_id": hotel["id"],
            "salutation": "Mr",
            "first_name": f"TEST_Refund_{days_from_now}days",
            "last_name": "User",
            "email": f"test_refund_{days_from_now}@example.com",
            "street": "Test Street 123",
            "postal_code": "12345",
            "city": "Test City",
            "country": "Germany",
            "room_type": "single",
            "check_in": check_in,
            "check_out": check_out,
            "language": "en"
        }
        
        response = requests.post(f"{BASE_URL}/api/bookings", json=booking_data)
        return response.json()["booking"]
    
    def test_refund_100_percent_more_than_7_days(self, auth_headers):
        """Test 100% refund when cancelling >7 days before check-in"""
        booking = self.create_booking_with_checkin_days(10)
        
        response = requests.post(
            f"{BASE_URL}/api/bookings/{booking['id']}/cancel",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["refund_percentage"] == 100, f"Expected 100%, got {data['refund_percentage']}%"
        print(f"✓ >7 days before check-in: 100% refund policy verified")
    
    def test_refund_50_percent_1_to_7_days(self, auth_headers):
        """Test 50% refund when cancelling 1-7 days before check-in"""
        booking = self.create_booking_with_checkin_days(5)  # 5 days from now
        
        response = requests.post(
            f"{BASE_URL}/api/bookings/{booking['id']}/cancel",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["refund_percentage"] == 50, f"Expected 50%, got {data['refund_percentage']}%"
        print(f"✓ 1-7 days before check-in: 50% refund policy verified")
    
    def test_refund_0_percent_less_than_1_day(self, auth_headers):
        """Test 0% refund when cancelling <1 day before check-in"""
        # Create booking for today (0 days from now)
        booking = self.create_booking_with_checkin_days(0)
        
        response = requests.post(
            f"{BASE_URL}/api/bookings/{booking['id']}/cancel",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["refund_percentage"] == 0, f"Expected 0%, got {data['refund_percentage']}%"
        print(f"✓ <1 day before check-in: 0% refund policy verified")


class TestAdminHotels:
    """Admin hotels management tests"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_admin_hotels(self, auth_headers):
        """Test fetching all hotels as admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/hotels",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Get hotels failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one hotel"
        print(f"✓ Admin hotels endpoint working, found {len(data)} hotels")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
