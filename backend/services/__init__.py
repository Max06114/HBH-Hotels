"""
Email Templates Service for HBH Hotel Booking
Provides consistent, bilingual email templates for all communications.
"""

def get_email_header(title: str, lang: str = "de") -> str:
    """Generate consistent email header."""
    return f"""
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.8; color: #333; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 30px; background: #FDFBF7; }}
            .header {{ text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #6B1D2A; }}
            .header h1 {{ color: #6B1D2A; margin: 0; font-size: 24px; }}
            .header p {{ color: #666; margin: 5px 0 0 0; font-size: 14px; }}
            .content {{ background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; }}
            .highlight-box {{ background: #F5F2EA; padding: 20px; border-radius: 8px; margin: 20px 0; }}
            .amount-box {{ background: #6B1D2A; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }}
            .amount-box .amount {{ font-size: 28px; font-weight: bold; }}
            .info-table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
            .info-table td {{ padding: 12px; border-bottom: 1px solid #E5E0D5; }}
            .info-table td:first-child {{ color: #666; width: 40%; }}
            .info-table td:last-child {{ font-weight: 500; }}
            .btn {{ display: inline-block; padding: 15px 30px; text-decoration: none; border-radius: 30px; font-weight: bold; margin: 5px; }}
            .btn-primary {{ background: #6B1D2A; color: white !important; }}
            .btn-paypal {{ background: #0070BA; color: white !important; }}
            .btn-secondary {{ background: #F5F2EA; color: #6B1D2A !important; border: 1px solid #6B1D2A; }}
            .footer {{ text-align: center; padding-top: 20px; border-top: 1px solid #E5E0D5; color: #666; font-size: 13px; }}
            .signature {{ margin-top: 30px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Happy Birthday Händel 2027</h1>
                <p>{'Hotelreservierungen für das Chorfestival' if lang == 'de' else 'Hotel Accommodations for the Choir Festival'}</p>
            </div>
            <div class="content">
                <h2 style="color: #6B1D2A; margin-top: 0;">{title}</h2>
    """


def get_email_footer(lang: str = "de") -> str:
    """Generate consistent email footer."""
    if lang == "de":
        return """
            </div>
            <div class="signature">
                <p>Mit freundlichen Grüßen,</p>
                <p><strong>Max von Arnim</strong><br>Travel Events</p>
            </div>
            <div class="footer">
                <p>Bei Fragen erreichen Sie uns unter <a href="mailto:info@travel-events.de" style="color: #6B1D2A;">info@travel-events.de</a></p>
                <p style="font-size: 11px; color: #999;">Travel Events | Halle (Saale)</p>
            </div>
        </div>
    </body>
    </html>
        """
    else:
        return """
            </div>
            <div class="signature">
                <p>Best regards,</p>
                <p><strong>Max von Arnim</strong><br>Travel Events</p>
            </div>
            <div class="footer">
                <p>For questions, please contact us at <a href="mailto:info@travel-events.de" style="color: #6B1D2A;">info@travel-events.de</a></p>
                <p style="font-size: 11px; color: #999;">Travel Events | Halle (Saale), Germany</p>
            </div>
        </div>
    </body>
    </html>
        """


def format_price_de(amount: float) -> str:
    """Format price in German style (comma as decimal separator)."""
    return f"{amount:.2f}".replace('.', ',')


def generate_booking_confirmation_email(booking: dict, hotel: dict, lang: str = "de") -> tuple:
    """Generate booking confirmation email with invoice."""
    deposit_formatted = format_price_de(booking['deposit_amount'])
    remaining_formatted = format_price_de(booking['remaining_amount'])
    total_formatted = format_price_de(booking['total_price'])
    
    if lang == "de":
        title = "Buchungsbestätigung"
        subject = f"Buchungsbestätigung - {booking['booking_number']}"
        body = f"""
                <p>Sehr geehrte(r) {booking['salutation']} {booking['last_name']},</p>
                
                <p>vielen Dank für Ihre Buchung zum Festival <strong>Happy Birthday Händel 2027</strong>!</p>
                
                <div class="highlight-box">
                    <strong>Buchungsnummer: {booking['booking_number']}</strong>
                </div>
                
                <table class="info-table">
                    <tr><td>Hotel:</td><td>{hotel['name']}</td></tr>
                    <tr><td>Zimmertyp:</td><td>{booking.get('room_type_display', booking.get('room_type', 'Einzelzimmer'))}</td></tr>
                    <tr><td>Anreise:</td><td>{booking['check_in']}</td></tr>
                    <tr><td>Abreise:</td><td>{booking['check_out']}</td></tr>
                    <tr><td>Gesamtpreis:</td><td>{total_formatted} €</td></tr>
                </table>
                
                <div class="amount-box">
                    <div>Anzahlung (25%)</div>
                    <div class="amount">{deposit_formatted} € bezahlt ✓</div>
                </div>
                
                <p><strong>Wichtig:</strong> Der Restbetrag von <strong>{remaining_formatted} €</strong> ist 6 Wochen vor Anreise fällig. Sie erhalten rechtzeitig eine Zahlungserinnerung.</p>
                
                <p>Ihre Rechnung finden Sie im Anhang dieser E-Mail.</p>
        """
    else:
        title = "Booking Confirmation"
        subject = f"Booking Confirmation - {booking['booking_number']}"
        body = f"""
                <p>Dear {booking['salutation']} {booking['last_name']},</p>
                
                <p>Thank you for your booking for the <strong>Happy Birthday Händel 2027</strong> festival!</p>
                
                <div class="highlight-box">
                    <strong>Booking Number: {booking['booking_number']}</strong>
                </div>
                
                <table class="info-table">
                    <tr><td>Hotel:</td><td>{hotel['name']}</td></tr>
                    <tr><td>Room Type:</td><td>{booking.get('room_type_display', booking.get('room_type', 'Single Room'))}</td></tr>
                    <tr><td>Check-in:</td><td>{booking['check_in']}</td></tr>
                    <tr><td>Check-out:</td><td>{booking['check_out']}</td></tr>
                    <tr><td>Total Price:</td><td>€{booking['total_price']:.2f}</td></tr>
                </table>
                
                <div class="amount-box">
                    <div>Deposit (25%)</div>
                    <div class="amount">€{booking['deposit_amount']:.2f} paid ✓</div>
                </div>
                
                <p><strong>Important:</strong> The remaining balance of <strong>€{booking['remaining_amount']:.2f}</strong> is due 6 weeks before arrival. You will receive a payment reminder in time.</p>
                
                <p>Please find your invoice attached to this email.</p>
        """
    
    full_body = get_email_header(title, lang) + body + get_email_footer(lang)
    return subject, full_body


def generate_remaining_payment_confirmation_email(booking: dict, hotel: dict, payment_method: str, lang: str = "de") -> tuple:
    """Generate confirmation email for remaining balance payment."""
    remaining_formatted = format_price_de(booking['remaining_amount'])
    total_formatted = format_price_de(booking['total_price'])
    method_text = "Kreditkarte" if payment_method == "stripe" else "PayPal"
    method_text_en = "credit card" if payment_method == "stripe" else "PayPal"
    
    if lang == "de":
        title = "Restzahlung erfolgreich!"
        subject = f"Zahlungsbestätigung Restzahlung - {booking['booking_number']}"
        body = f"""
                <p>Sehr geehrte(r) {booking['salutation']} {booking['last_name']},</p>
                
                <p>Ihre Restzahlung wurde erfolgreich verarbeitet.</p>
                
                <div class="amount-box">
                    <div>Restzahlung (75%)</div>
                    <div class="amount">{remaining_formatted} € bezahlt ✓</div>
                    <div style="font-size: 12px; margin-top: 5px;">via {method_text}</div>
                </div>
                
                <table class="info-table">
                    <tr><td>Buchungsnummer:</td><td>{booking['booking_number']}</td></tr>
                    <tr><td>Hotel:</td><td>{hotel['name']}</td></tr>
                    <tr><td>Anreise:</td><td>{booking['check_in']}</td></tr>
                    <tr><td>Abreise:</td><td>{booking['check_out']}</td></tr>
                </table>
                
                <div class="highlight-box" style="text-align: center;">
                    <strong style="color: #2E7D32; font-size: 18px;">✓ Ihre Buchung ist nun vollständig bezahlt</strong>
                    <p style="margin: 10px 0 0 0;">Gesamtbetrag: {total_formatted} €</p>
                </div>
                
                <p>Wir freuen uns auf Ihren Besuch beim Festival Happy Birthday Händel 2027!</p>
        """
    else:
        title = "Remaining Balance Paid!"
        subject = f"Payment Confirmation - Remaining Balance - {booking['booking_number']}"
        body = f"""
                <p>Dear {booking['salutation']} {booking['last_name']},</p>
                
                <p>Your remaining payment has been successfully processed.</p>
                
                <div class="amount-box">
                    <div>Remaining Balance (75%)</div>
                    <div class="amount">€{booking['remaining_amount']:.2f} paid ✓</div>
                    <div style="font-size: 12px; margin-top: 5px;">via {method_text_en}</div>
                </div>
                
                <table class="info-table">
                    <tr><td>Booking Number:</td><td>{booking['booking_number']}</td></tr>
                    <tr><td>Hotel:</td><td>{hotel['name']}</td></tr>
                    <tr><td>Check-in:</td><td>{booking['check_in']}</td></tr>
                    <tr><td>Check-out:</td><td>{booking['check_out']}</td></tr>
                </table>
                
                <div class="highlight-box" style="text-align: center;">
                    <strong style="color: #2E7D32; font-size: 18px;">✓ Your booking is now fully paid</strong>
                    <p style="margin: 10px 0 0 0;">Total amount: €{booking['total_price']:.2f}</p>
                </div>
                
                <p>We look forward to welcoming you at the Happy Birthday Händel 2027 festival!</p>
        """
    
    full_body = get_email_header(title, lang) + body + get_email_footer(lang)
    return subject, full_body


def generate_payment_reminder_email(booking: dict, hotel: dict, stripe_url: str, paypal_url: str, invoice_link: str, lang: str = "de") -> tuple:
    """Generate payment reminder email with payment links."""
    remaining_formatted = format_price_de(booking['remaining_amount'])
    
    if lang == "de":
        title = "Zahlungserinnerung"
        subject = "Zahlungserinnerung - Restzahlung für Ihre Hotelbuchung"
        body = f"""
                <p>Sehr geehrte(r) {booking['salutation']} {booking['last_name']},</p>
                
                <p>in einer Woche ist die Restzahlung für Ihre Hotelbuchung im <strong>{hotel['name']}</strong> fällig.</p>
                
                <table class="info-table">
                    <tr><td>Buchungsnummer:</td><td>{booking['booking_number']}</td></tr>
                    <tr><td>Hotel:</td><td>{hotel['name']}</td></tr>
                    <tr><td>Anreise:</td><td>{booking['check_in']}</td></tr>
                    <tr><td>Abreise:</td><td>{booking['check_out']}</td></tr>
                </table>
                
                <div class="amount-box">
                    <div>Fälliger Restbetrag</div>
                    <div class="amount">{remaining_formatted} €</div>
                </div>
                
                <p>Bitte benutzen Sie einen der folgenden Zahlungslinks:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{stripe_url}" class="btn btn-primary">Mit Kreditkarte bezahlen</a>
                    <br><br>
                    <a href="{paypal_url}" class="btn btn-paypal">Mit PayPal bezahlen</a>
                </div>
                
                <p style="text-align: center;">
                    <a href="{invoice_link}" class="btn btn-secondary">Rechnung herunterladen</a>
                </p>
        """
    else:
        title = "Payment Reminder"
        subject = "Payment Reminder - Remaining Balance for Your Hotel Booking"
        body = f"""
                <p>Dear {booking['salutation']} {booking['last_name']},</p>
                
                <p>The remaining payment for your hotel booking at <strong>{hotel['name']}</strong> is due in one week.</p>
                
                <table class="info-table">
                    <tr><td>Booking Number:</td><td>{booking['booking_number']}</td></tr>
                    <tr><td>Hotel:</td><td>{hotel['name']}</td></tr>
                    <tr><td>Check-in:</td><td>{booking['check_in']}</td></tr>
                    <tr><td>Check-out:</td><td>{booking['check_out']}</td></tr>
                </table>
                
                <div class="amount-box">
                    <div>Remaining Balance Due</div>
                    <div class="amount">€{booking['remaining_amount']:.2f}</div>
                </div>
                
                <p>Please use one of the following payment links:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{stripe_url}" class="btn btn-primary">Pay with Credit Card</a>
                    <br><br>
                    <a href="{paypal_url}" class="btn btn-paypal">Pay with PayPal</a>
                </div>
                
                <p style="text-align: center;">
                    <a href="{invoice_link}" class="btn btn-secondary">Download Invoice</a>
                </p>
        """
    
    full_body = get_email_header(title, lang) + body + get_email_footer(lang)
    return subject, full_body


def generate_cancellation_email(booking: dict, hotel: dict, refund_amount: float, refund_percentage: int, lang: str = "de") -> tuple:
    """Generate cancellation confirmation email."""
    refund_formatted = format_price_de(refund_amount)
    
    if lang == "de":
        title = "Stornierungsbestätigung"
        subject = f"Stornierungsbestätigung - {booking['booking_number']}"
        
        if refund_amount > 0:
            refund_text = f"""
                <div class="amount-box" style="background: #2E7D32;">
                    <div>Rückerstattung ({refund_percentage}%)</div>
                    <div class="amount">{refund_formatted} €</div>
                </div>
                <p>Die Rückerstattung wird innerhalb von 5-10 Werktagen auf Ihrem Konto gutgeschrieben.</p>
            """
        else:
            refund_text = """
                <div class="highlight-box">
                    <p>Aufgrund der kurzfristigen Stornierung (weniger als 1 Tag vor Anreise) ist leider keine Rückerstattung möglich.</p>
                </div>
            """
        
        body = f"""
                <p>Sehr geehrte(r) {booking['salutation']} {booking['last_name']},</p>
                
                <p>Ihre Buchung wurde storniert.</p>
                
                <table class="info-table">
                    <tr><td>Buchungsnummer:</td><td>{booking['booking_number']}</td></tr>
                    <tr><td>Hotel:</td><td>{hotel['name']}</td></tr>
                    <tr><td>Geplante Anreise:</td><td>{booking['check_in']}</td></tr>
                </table>
                
                {refund_text}
                
                <p>Wir bedauern, dass Sie nicht am Festival teilnehmen können und hoffen, Sie bei einer zukünftigen Veranstaltung begrüßen zu dürfen.</p>
        """
    else:
        title = "Cancellation Confirmation"
        subject = f"Cancellation Confirmation - {booking['booking_number']}"
        
        if refund_amount > 0:
            refund_text = f"""
                <div class="amount-box" style="background: #2E7D32;">
                    <div>Refund ({refund_percentage}%)</div>
                    <div class="amount">€{refund_amount:.2f}</div>
                </div>
                <p>The refund will be credited to your account within 5-10 business days.</p>
            """
        else:
            refund_text = """
                <div class="highlight-box">
                    <p>Due to the late cancellation (less than 1 day before arrival), unfortunately no refund is possible.</p>
                </div>
            """
        
        body = f"""
                <p>Dear {booking['salutation']} {booking['last_name']},</p>
                
                <p>Your booking has been cancelled.</p>
                
                <table class="info-table">
                    <tr><td>Booking Number:</td><td>{booking['booking_number']}</td></tr>
                    <tr><td>Hotel:</td><td>{hotel['name']}</td></tr>
                    <tr><td>Planned Check-in:</td><td>{booking['check_in']}</td></tr>
                </table>
                
                {refund_text}
                
                <p>We regret that you cannot attend the festival and hope to welcome you at a future event.</p>
        """
    
    full_body = get_email_header(title, lang) + body + get_email_footer(lang)
    return subject, full_body



def generate_arrival_reminder_email(booking: dict, hotel: dict, lang: str = "de") -> tuple:
    """Generate arrival reminder email (1 week before check-in)."""
    
    if lang == "de":
        subject = f"Ihre Anreise steht bevor - Happy Birthday Händel 2027"
        title = "Erinnerung: Ihre Anreise steht bevor!"
        
        body = f"""
                <p>Sehr geehrte/r {booking['salutation']} {booking['last_name']},</p>
                
                <p>in einer Woche ist es soweit! Wir freuen uns, Sie beim <strong>Happy Birthday Händel Festival 2027</strong> begrüßen zu dürfen.</p>
                
                <div class="highlight-box">
                    <h3 style="margin-top: 0; color: #6B1D2A;">Ihre Buchungsübersicht</h3>
                    <table class="info-table">
                        <tr><td>Buchungsnummer:</td><td><strong>{booking['booking_number']}</strong></td></tr>
                        <tr><td>Hotel:</td><td>{hotel['name']}</td></tr>
                        <tr><td>Anreise:</td><td><strong>{booking['check_in']}</strong></td></tr>
                        <tr><td>Abreise:</td><td>{booking['check_out']}</td></tr>
                        <tr><td>Zimmertyp:</td><td>{booking.get('room_type', 'Standard')}</td></tr>
                        <tr><td>Gesamtpreis:</td><td>{booking['total_price']:.2f} €</td></tr>
                    </table>
                </div>
                
                <div class="amount-box" style="background: #28a745;">
                    <p style="margin: 0; font-size: 16px;">✓ Vollständig bezahlt</p>
                </div>
                
                <div class="highlight-box">
                    <h3 style="margin-top: 0; color: #6B1D2A;">Hoteladresse</h3>
                    <p style="margin: 0; font-size: 16px;">
                        <strong>{hotel['name']}</strong><br>
                        {hotel.get('address', 'Halle (Saale)')}<br><br>
                        <em>Entfernung zur Händelhalle: {hotel.get('distance_to_venue', 'Fußläufig erreichbar')}</em>
                    </p>
                </div>
                
                <p><strong>Wichtige Hinweise:</strong></p>
                <ul>
                    <li>Check-in ist ab 15:00 Uhr möglich</li>
                    <li>Bitte zeigen Sie diese Buchungsbestätigung bei der Anreise vor</li>
                    <li>Frühstück und Bettensteuer sind bereits inklusive</li>
                </ul>
                
                <p>Wir wünschen Ihnen eine angenehme Anreise und ein wundervolles Festival!</p>
        """
    else:
        subject = f"Your arrival is coming up - Happy Birthday Händel 2027"
        title = "Reminder: Your Arrival is Coming Up!"
        
        body = f"""
                <p>Dear {booking['salutation']} {booking['last_name']},</p>
                
                <p>In one week, it's time! We look forward to welcoming you at the <strong>Happy Birthday Händel Festival 2027</strong>.</p>
                
                <div class="highlight-box">
                    <h3 style="margin-top: 0; color: #6B1D2A;">Your Booking Summary</h3>
                    <table class="info-table">
                        <tr><td>Booking Number:</td><td><strong>{booking['booking_number']}</strong></td></tr>
                        <tr><td>Hotel:</td><td>{hotel['name']}</td></tr>
                        <tr><td>Check-in:</td><td><strong>{booking['check_in']}</strong></td></tr>
                        <tr><td>Check-out:</td><td>{booking['check_out']}</td></tr>
                        <tr><td>Room Type:</td><td>{booking.get('room_type', 'Standard')}</td></tr>
                        <tr><td>Total Price:</td><td>€{booking['total_price']:.2f}</td></tr>
                    </table>
                </div>
                
                <div class="amount-box" style="background: #28a745;">
                    <p style="margin: 0; font-size: 16px;">✓ Fully Paid</p>
                </div>
                
                <div class="highlight-box">
                    <h3 style="margin-top: 0; color: #6B1D2A;">Hotel Address</h3>
                    <p style="margin: 0; font-size: 16px;">
                        <strong>{hotel['name']}</strong><br>
                        {hotel.get('address', 'Halle (Saale)')}<br><br>
                        <em>Distance to Händelhalle: {hotel.get('distance_to_venue_en', hotel.get('distance_to_venue', 'Walking distance'))}</em>
                    </p>
                </div>
                
                <p><strong>Important Notes:</strong></p>
                <ul>
                    <li>Check-in is available from 3:00 PM</li>
                    <li>Please present this booking confirmation upon arrival</li>
                    <li>Breakfast and city tax are already included</li>
                </ul>
                
                <p>We wish you a pleasant journey and a wonderful festival!</p>
        """
    
    full_body = get_email_header(title, lang) + body + get_email_footer(lang)
    return subject, full_body
