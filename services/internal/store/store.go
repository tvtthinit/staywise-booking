package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct{ pool *pgxpool.Pool }

type Booking struct {
	ID, ConfirmationCode, CheckIn, CheckOut, GuestName, Email, Currency, PaymentID, Status string
	RoomID, Guests int32
	Amount int64
}

type Payment struct {
	ID, BookingID, Currency, Method, Status string
	Amount int64
}

func Open(databaseURL string) (*Store, error) {
	pool := pgxpool.New(context.Background(), databaseURL)
	var err error
	for attempt := 0; attempt < 30; attempt++ {
		ctx, cancel := context.WithTimeout(context.Background(), time.Second)
		err = pool.Ping(ctx)
		cancel()
		if err == nil { return &Store{pool: pool}, nil }
		time.Sleep(time.Second)
	}
	pool.Close()
	return nil, err
}

func (store *Store) Close() { store.pool.Close() }

func (store *Store) EnsureSchema(ctx context.Context) error {
	_, err := store.pool.Exec(ctx, `
CREATE TABLE IF NOT EXISTS room_prices (room_id BIGINT PRIMARY KEY, nightly_amount BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS service_bookings (
  booking_id TEXT PRIMARY KEY, confirmation_code TEXT UNIQUE NOT NULL, room_id BIGINT NOT NULL,
  check_in DATE NOT NULL, check_out DATE NOT NULL, guests INTEGER NOT NULL, guest_name TEXT NOT NULL,
  email TEXT NOT NULL, amount BIGINT NOT NULL, currency TEXT NOT NULL, payment_id TEXT NOT NULL,
  status TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS service_payments (
  payment_id TEXT PRIMARY KEY, booking_id TEXT NOT NULL, amount BIGINT NOT NULL,
  currency TEXT NOT NULL, method TEXT NOT NULL, status TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO room_prices (room_id, nightly_amount) VALUES (1, 180), (2, 240), (3, 320)
ON CONFLICT (room_id) DO NOTHING;
`)
	return err
}

func (store *Store) NightlyAmount(ctx context.Context, roomID int32) (int64, error) {
	var amount int64
	err := store.pool.QueryRow(ctx, `SELECT nightly_amount FROM room_prices WHERE room_id = $1`, roomID).Scan(&amount)
	if errors.Is(err, pgx.ErrNoRows) { return 150, nil }
	return amount, err
}

func (store *Store) SaveBooking(ctx context.Context, booking Booking) error {
	_, err := store.pool.Exec(ctx, `INSERT INTO service_bookings
 (booking_id, confirmation_code, room_id, check_in, check_out, guests, guest_name, email, amount, currency, payment_id, status)
 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, booking.ID, booking.ConfirmationCode, booking.RoomID, booking.CheckIn, booking.CheckOut, booking.Guests, booking.GuestName, booking.Email, booking.Amount, booking.Currency, booking.PaymentID, booking.Status)
	return err
}

func (store *Store) SavePayment(ctx context.Context, payment Payment) error {
	_, err := store.pool.Exec(ctx, `INSERT INTO service_payments
 (payment_id, booking_id, amount, currency, method, status)
 VALUES ($1, $2, $3, $4, $5, $6)`, payment.ID, payment.BookingID, payment.Amount, payment.Currency, payment.Method, payment.Status)
	return err
}