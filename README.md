# Staywise

A local MVP for a curated hotel booking platform, based on the product brief in `claude.md`.

## Included

- React + TypeScript + Vite booking experience
- Destination, date, and guest search
- Curated hotel result cards with responsive layout
- Booking form with confirmation code
- Django REST API for hotel search and booking creation
- Django ORM models for hotels and bookings
- SQLite local default, with a straightforward PostgreSQL migration path

## Run the frontend

```powershell
npm.cmd install
npm.cmd run dev
```

Open http://localhost:5173. The frontend includes fallback demo data, so it works by itself.

## Run the API

Create and activate a Python 3.12 virtual environment, then install dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

The API is available at http://127.0.0.1:8000. With it running, the frontend automatically uses `/api/hotels/` and `/api/bookings/` through the Vite proxy.

## API endpoints

- `GET /api/hotels/?destination=Amsterdam`
- `POST /api/bookings/` with `hotel`, `guest_name`, `email`, `check_in`, `check_out`, and `guests`
- `GET /admin/` for local Django administration after creating a superuser

## Local admin login

Open http://127.0.0.1:8000/admin/ and use:

- Username: `admin`
- Password: `StaywiseAdmin123!`

This is for local development only. Change or remove this account before deploying.

This is an MVP foundation. Payments, authentication, inventory locking, availability rules, Celery jobs, and production PostgreSQL/Redis configuration should be added before production use.
