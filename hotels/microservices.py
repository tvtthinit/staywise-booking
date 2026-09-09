import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import jwt


class MicroserviceUnavailable(Exception):
    pass


def _service_url(name, default):
    return os.getenv(name, default).rstrip('/')


def _call(name, default_url, path, payload):
    secret = os.getenv('JWT_SECRET', 'change-me-in-production')
    token = jwt.encode({'sub': 'django-api'}, secret, algorithm='HS256')
    request = Request(
        f'{_service_url(name, default_url)}{path}',
        data=json.dumps(payload).encode('utf-8'),
        headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
        method='POST',
    )
    try:
        with urlopen(request, timeout=float(os.getenv('MICROSERVICE_TIMEOUT', '5'))) as response:
            return json.loads(response.read().decode('utf-8'))
    except (HTTPError, URLError, TimeoutError, ValueError) as error:
        raise MicroserviceUnavailable('A required microservice is unavailable.') from error


def calculate_room(room_id, check_in, check_out, guests, currency='USD'):
    return _call('CALCULATING_ROOM_SERVICE_URL', 'http://127.0.0.1:9102', '/v1/room-calculations', {
        'room_id': room_id,
        'check_in': str(check_in),
        'check_out': str(check_out),
        'guests': guests,
        'currency': currency,
    })


def create_booking(room_id, check_in, check_out, guests, guest_name, email, currency='USD'):
    return _call('BOOKING_SERVICE_URL', 'http://127.0.0.1:9101', '/v1/bookings', {
        'room_id': room_id,
        'check_in': str(check_in),
        'check_out': str(check_out),
        'guests': guests,
        'guest_name': guest_name,
        'email': email,
        'currency': currency,
    })


def process_payment(booking_id, amount, currency='USD', method='demo_card'):
    return _call('PAYMENT_SERVICE_URL', 'http://127.0.0.1:9103', '/v1/payments', {
        'booking_id': str(booking_id),
        'amount': amount,
        'currency': currency,
        'method': method,
    })