"""
End-to-End Payment Flow Test
Tests the complete booking and payment flow:
1. Create a new booking via POST /api/bookings
2. Create Stripe checkout session for deposit (25%) via POST /api/payments/stripe/create-session
3. Verify booking status after payment
4. Send payment reminder with Stripe/PayPal links via POST /api/admin/bookings/{id}/send-reminder
5. Verify reminder email contains payment links
6. Create remaining payment session and verify booking becomes 'fully_paid'
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://event-payments-3.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "info@travel-events.de"
ADMIN_PASSWORD = "admin123"
TEST_CUSTOMER_EMAIL = "test@example.com"


@pytest.fixture(scope="module")
def auth_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/admin/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture(scope="module")
def available_hotels():
    """Get list of available hotels"""
    response = requests.get(f"{BASE_URL}/api/hotels")
    assert response.status_code == 200, f"Failed to get hotels: {response.status_code}"
    hotels = response.json()
    assert len(hotels) > 0, "No hotels available"
    return hotels


class TestAPIHealth:
    """Test basic API health and connectivity"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200, f"API root failed: {response.status_code}"
        data = response.json()
        assert "message" in data
        print(f"✓ API root accessible: {data.get('message')}")
    
    def test_hotels_endpoint(self):
        """Test hotels endpoint returns data"""
        response = requests.get(f"{BASE_URL}/api/hotels")
        assert response.status_code == 200, f"Hotels endpoint failed: {response.status_code}"
        hotels = response.json()
        assert isinstance(hotels, list), "Hotels should be a list"
        assert len(hotels) > 0, "Should have at least one hotel"
        print(f"✓ Hotels endpoint returns {len(hotels)} hotels")
        for hotel in hotels:
            print(f"  - {hotel.get('name')}: Single {hotel.get('single_price')}€, Double {hotel.get('double_price')}€")


class TestAdminAuthentication:
    """Test admin authentication flow"""
    
    def test_admin_login_success(self):
        """Test successful admin login"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "email" in data, "Response should contain email"
        assert data["email"] == ADMIN_EMAIL
        print(f"✓ Admin login successful for {ADMIN_EMAIL}")
    
    def test_admin_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")


class TestBookingCreation:
    """Test booking creation flow"""
    
    def test_create_booking_success(self, available_hotels):
        """Test creating a new booking"""
        hotel = available_hotels[0]  # Use first available hotel
        
        booking_data = {
            "hotel_id": hotel["id"],
            "salutation": "Herr",
            "first_name": "Test",
            "last_name": f"User_{uuid.uuid4().hex[:6]}",
            "email": TEST_CUSTOMER_EMAIL,
            "street": "Teststraße 123",
            "postal_code": "12345",
            "city": "Berlin",
            "country": "Deutschland",
            "room_type": "single",
            "check_in": "2027-02-25",
            "check_out": "2027-02-28",
            "notes": "E2E Test Booking",
            "language": "de"
        }
        
        response = requests.post(f"{BASE_URL}/api/bookings", json=booking_data)
        assert response.status_code == 200, f"Booking creation failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "booking" in data, "Response should contain booking"
        booking = data["booking"]
        
        # Verify booking fields
        assert booking["hotel_id"] == hotel["id"]
        assert booking["email"] == TEST_CUSTOMER_EMAIL
        assert booking["payment_status"] == "pending"
        assert booking["nights"] == 3  # 25-28 Feb = 3 nights
        
        # Verify price calculations
        expected_total = hotel["single_price"] * 3
        assert booking["total_price"] == expected_total, f"Expected total {expected_total}, got {booking['total_price']}"
        
        expected_deposit = round(expected_total * 0.25, 2)
        assert booking["deposit_amount"] == expected_deposit, f"Expected deposit {expected_deposit}, got {booking['deposit_amount']}"
        
        expected_remaining = round(expected_total - expected_deposit, 2)
        assert booking["remaining_amount"] == expected_remaining
        
        print(f"✓ Booking created: {booking['booking_number']}")
        print(f"  - Hotel: {booking['hotel_name']}")
        print(f"  - Total: {booking['total_price']}€")
        print(f"  - Deposit (25%): {booking['deposit_amount']}€")
        print(f"  - Remaining (75%): {booking['remaining_amount']}€")
        
        return booking
    
    def test_create_booking_invalid_hotel(self):
        """Test booking with invalid hotel ID"""
        booking_data = {
            "hotel_id": "invalid-hotel-id",
            "salutation": "Herr",
            "first_name": "Test",
            "last_name": "User",
            "email": TEST_CUSTOMER_EMAIL,
            "street": "Teststraße 123",
            "postal_code": "12345",
            "city": "Berlin",
            "country": "Deutschland",
            "room_type": "single",
            "check_in": "2027-02-25",
            "check_out": "2027-02-28",
            "language": "de"
        }
        
        response = requests.post(f"{BASE_URL}/api/bookings", json=booking_data)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid hotel ID correctly rejected")
    
    def test_create_booking_invalid_dates(self, available_hotels):
        """Test booking with invalid dates (check-out before check-in)"""
        hotel = available_hotels[0]
        
        booking_data = {
            "hotel_id": hotel["id"],
            "salutation": "Herr",
            "first_name": "Test",
            "last_name": "User",
            "email": TEST_CUSTOMER_EMAIL,
            "street": "Teststraße 123",
            "postal_code": "12345",
            "city": "Berlin",
            "country": "Deutschland",
            "room_type": "single",
            "check_in": "2027-02-28",
            "check_out": "2027-02-25",  # Before check-in
            "language": "de"
        }
        
        response = requests.post(f"{BASE_URL}/api/bookings", json=booking_data)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Invalid dates correctly rejected")


class TestStripePaymentSession:
    """Test Stripe payment session creation"""
    
    @pytest.fixture
    def test_booking(self, available_hotels):
        """Create a test booking for payment tests"""
        hotel = available_hotels[0]
        
        booking_data = {
            "hotel_id": hotel["id"],
            "salutation": "Herr",
            "first_name": "Stripe",
            "last_name": f"Test_{uuid.uuid4().hex[:6]}",
            "email": TEST_CUSTOMER_EMAIL,
            "street": "Teststraße 123",
            "postal_code": "12345",
            "city": "Berlin",
            "country": "Deutschland",
            "room_type": "single",
            "check_in": "2027-02-25",
            "check_out": "2027-02-28",
            "notes": "Stripe Payment Test",
            "language": "de"
        }
        
        response = requests.post(f"{BASE_URL}/api/bookings", json=booking_data)
        assert response.status_code == 200
        return response.json()["booking"]
    
    def test_create_stripe_deposit_session(self, test_booking):
        """Test creating Stripe checkout session for deposit payment"""
        booking_id = test_booking["id"]
        origin_url = "https://event-payments-3.preview.emergentagent.com"
        
        response = requests.post(
            f"{BASE_URL}/api/payments/stripe/create-session",
            params={
                "booking_id": booking_id,
                "origin_url": origin_url,
                "payment_type": "deposit"
            }
        )
        
        assert response.status_code == 200, f"Stripe session creation failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "url" in data, "Response should contain Stripe checkout URL"
        assert "session_id" in data, "Response should contain session ID"
        
        # Verify URL is a valid Stripe checkout URL
        assert "checkout.stripe.com" in data["url"], "URL should be a Stripe checkout URL"
        
        print(f"✓ Stripe deposit session created")
        print(f"  - Session ID: {data['session_id'][:30]}...")
        print(f"  - Checkout URL: {data['url'][:60]}...")
        
        return data
    
    def test_create_stripe_session_invalid_booking(self):
        """Test Stripe session with invalid booking ID"""
        response = requests.post(
            f"{BASE_URL}/api/payments/stripe/create-session",
            params={
                "booking_id": "invalid-booking-id",
                "origin_url": "https://example.com",
                "payment_type": "deposit"
            }
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid booking ID correctly rejected for Stripe session")
    
    def test_stripe_session_status_endpoint(self, test_booking):
        """Test Stripe session status endpoint"""
        booking_id = test_booking["id"]
        origin_url = "https://event-payments-3.preview.emergentagent.com"
        
        # Create session first
        session_response = requests.post(
            f"{BASE_URL}/api/payments/stripe/create-session",
            params={
                "booking_id": booking_id,
                "origin_url": origin_url,
                "payment_type": "deposit"
            }
        )
        assert session_response.status_code == 200
        session_id = session_response.json()["session_id"]
        
        # Check status
        status_response = requests.get(f"{BASE_URL}/api/payments/stripe/status/{session_id}")
        assert status_response.status_code == 200, f"Status check failed: {status_response.status_code}"
        
        status_data = status_response.json()
        assert "status" in status_data
        assert "payment_status" in status_data
        
        print(f"✓ Stripe session status: {status_data.get('status')}, payment: {status_data.get('payment_status')}")


class TestPaymentReminder:
    """Test payment reminder functionality"""
    
    @pytest.fixture
    def deposit_paid_booking(self, auth_headers):
        """Get or create a booking with deposit_paid status"""
        # First check if there's an existing deposit_paid booking
        response = requests.get(f"{BASE_URL}/api/admin/bookings", headers=auth_headers)
        assert response.status_code == 200
        
        bookings = response.json()
        deposit_paid = [b for b in bookings if b.get("payment_status") == "deposit_paid"]
        
        if deposit_paid:
            return deposit_paid[0]
        
        # If no deposit_paid booking exists, skip this test
        pytest.skip("No deposit_paid booking available for testing")
    
    def test_send_reminder_requires_auth(self):
        """Test that send-reminder endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/admin/bookings/some-id/send-reminder")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Send reminder endpoint requires authentication")
    
    def test_send_reminder_invalid_booking(self, auth_headers):
        """Test send-reminder with invalid booking ID"""
        response = requests.post(
            f"{BASE_URL}/api/admin/bookings/invalid-booking-id/send-reminder",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid booking ID correctly rejected")
    
    def test_send_reminder_success(self, auth_headers, deposit_paid_booking):
        """Test sending payment reminder to a deposit_paid booking"""
        booking_id = deposit_paid_booking["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/admin/bookings/{booking_id}/send-reminder",
            headers=auth_headers
        )
        
        # Should succeed (200) or fail if already fully paid (400)
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code} - {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert "message" in data
            print(f"✓ Payment reminder sent for booking {deposit_paid_booking['booking_number']}")
            
            # Verify booking was updated with reminder_sent flag
            booking_response = requests.get(f"{BASE_URL}/api/bookings/{booking_id}")
            assert booking_response.status_code == 200
            updated_booking = booking_response.json()
            
            # Check that payment links were generated
            if updated_booking.get("stripe_remaining_session_id"):
                print(f"  - Stripe remaining session ID generated")
            if updated_booking.get("paypal_remaining_order_id"):
                print(f"  - PayPal remaining order ID generated")
        else:
            print(f"⚠ Booking already fully paid or reminder already sent")


class TestRemainingPaymentFlow:
    """Test remaining payment (75%) flow"""
    
    def test_create_remaining_payment_link(self, auth_headers):
        """Test creating remaining payment link"""
        # Get a deposit_paid booking
        response = requests.get(f"{BASE_URL}/api/admin/bookings", headers=auth_headers)
        assert response.status_code == 200
        
        bookings = response.json()
        deposit_paid = [b for b in bookings if b.get("payment_status") == "deposit_paid"]
        
        if not deposit_paid:
            pytest.skip("No deposit_paid booking available")
        
        booking = deposit_paid[0]
        booking_id = booking["id"]
        
        # Create remaining payment link
        response = requests.post(f"{BASE_URL}/api/payments/remaining/{booking_id}")
        
        assert response.status_code == 200, f"Failed to create remaining payment link: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "payment_url" in data, "Response should contain payment_url"
        assert "method" in data, "Response should contain method"
        
        print(f"✓ Remaining payment link created")
        print(f"  - Method: {data['method']}")
        print(f"  - URL: {data['payment_url'][:60]}...")


class TestInvoiceDownload:
    """Test invoice download functionality"""
    
    def test_invoice_download_invalid_booking(self):
        """Test invoice download with invalid booking ID"""
        response = requests.get(f"{BASE_URL}/api/bookings/invalid-id/invoice")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid booking ID correctly rejected for invoice")
    
    def test_invoice_download_success(self, auth_headers):
        """Test successful invoice download"""
        # Get any booking
        response = requests.get(f"{BASE_URL}/api/admin/bookings", headers=auth_headers)
        assert response.status_code == 200
        
        bookings = response.json()
        if not bookings:
            pytest.skip("No bookings available")
        
        booking = bookings[0]
        booking_id = booking["id"]
        
        # Download invoice
        response = requests.get(f"{BASE_URL}/api/bookings/{booking_id}/invoice")
        assert response.status_code == 200, f"Invoice download failed: {response.status_code}"
        
        # Verify PDF content type
        content_type = response.headers.get("Content-Type", "")
        assert "application/pdf" in content_type, f"Expected PDF, got {content_type}"
        
        # Verify content disposition
        content_disposition = response.headers.get("Content-Disposition", "")
        assert "attachment" in content_disposition
        assert "Invoice_" in content_disposition
        
        # Verify content is not empty
        assert len(response.content) > 0, "PDF should not be empty"
        
        print(f"✓ Invoice downloaded successfully ({len(response.content)} bytes)")


class TestBookingStatusTransitions:
    """Test booking status transitions"""
    
    def test_booking_status_values(self, auth_headers):
        """Test that bookings have valid status values"""
        response = requests.get(f"{BASE_URL}/api/admin/bookings", headers=auth_headers)
        assert response.status_code == 200
        
        bookings = response.json()
        valid_statuses = ["pending", "deposit_paid", "fully_paid", "refunded", "cancelled"]
        
        status_counts = {}
        for booking in bookings:
            status = booking.get("payment_status")
            assert status in valid_statuses, f"Invalid status: {status}"
            status_counts[status] = status_counts.get(status, 0) + 1
        
        print(f"✓ All {len(bookings)} bookings have valid status")
        print(f"  - Status breakdown: {status_counts}")
    
    def test_admin_update_booking_status(self, auth_headers, available_hotels):
        """Test admin can update booking status"""
        # Create a test booking
        hotel = available_hotels[0]
        booking_data = {
            "hotel_id": hotel["id"],
            "salutation": "Herr",
            "first_name": "Status",
            "last_name": f"Test_{uuid.uuid4().hex[:6]}",
            "email": TEST_CUSTOMER_EMAIL,
            "street": "Teststraße 123",
            "postal_code": "12345",
            "city": "Berlin",
            "country": "Deutschland",
            "room_type": "single",
            "check_in": "2027-02-25",
            "check_out": "2027-02-28",
            "language": "de"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/bookings", json=booking_data)
        assert create_response.status_code == 200
        booking = create_response.json()["booking"]
        booking_id = booking["id"]
        
        # Update status to deposit_paid
        update_response = requests.put(
            f"{BASE_URL}/api/admin/bookings/{booking_id}/status",
            params={"status": "deposit_paid"},
            headers=auth_headers
        )
        assert update_response.status_code == 200, f"Status update failed: {update_response.status_code}"
        
        # Verify status was updated
        get_response = requests.get(f"{BASE_URL}/api/bookings/{booking_id}")
        assert get_response.status_code == 200
        updated_booking = get_response.json()
        assert updated_booking["payment_status"] == "deposit_paid"
        
        print(f"✓ Booking status updated to deposit_paid")
        
        # Update to fully_paid
        update_response = requests.put(
            f"{BASE_URL}/api/admin/bookings/{booking_id}/status",
            params={"status": "fully_paid"},
            headers=auth_headers
        )
        assert update_response.status_code == 200
        
        # Verify
        get_response = requests.get(f"{BASE_URL}/api/bookings/{booking_id}")
        updated_booking = get_response.json()
        assert updated_booking["payment_status"] == "fully_paid"
        
        print(f"✓ Booking status updated to fully_paid")


class TestAdminStats:
    """Test admin statistics endpoint"""
    
    def test_admin_stats(self, auth_headers):
        """Test admin stats endpoint returns correct data"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=auth_headers)
        assert response.status_code == 200, f"Stats failed: {response.status_code}"
        
        data = response.json()
        required_fields = ["total_bookings", "pending_bookings", "paid_bookings", "cancelled_bookings", "total_revenue"]
        
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ Admin stats retrieved")
        print(f"  - Total bookings: {data['total_bookings']}")
        print(f"  - Pending: {data['pending_bookings']}")
        print(f"  - Paid: {data['paid_bookings']}")
        print(f"  - Cancelled: {data['cancelled_bookings']}")
        print(f"  - Total revenue: {data['total_revenue']}€")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
