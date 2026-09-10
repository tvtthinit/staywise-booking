package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"time"

	"staywise/services/internal/config"
	"staywise/services/internal/rpc"
	"staywise/services/internal/store"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type server struct {
	calculatingRoom rpc.CalculatingRoomClient
	payment         rpc.PaymentClient
	serviceToken    string
	store           *store.Store
}

func (server *server) CreateBooking(ctx context.Context, request *rpc.CreateBookingRequest) (*rpc.CreateBookingResponse, error) {
	if request.Email == "" || request.GuestName == "" { return nil, grpc.Errorf(3, "guest_name and email are required") }
	serviceContext, cancel := context.WithTimeout(rpc.WithBearer(ctx, server.serviceToken), 5*time.Second)
	defer cancel()
	quote, err := server.calculatingRoom.CalculateRoom(serviceContext, &rpc.CalculateRoomRequest{RoomID: request.RoomID, CheckIn: request.CheckIn, CheckOut: request.CheckOut, Guests: request.Guests, Currency: request.Currency})
	if err != nil { return nil, err }
	bookingID := fmt.Sprintf("booking_%d", time.Now().UnixNano())
	payment, err := server.payment.ProcessPayment(serviceContext, &rpc.ProcessPaymentRequest{BookingID: bookingID, Amount: quote.TotalAmount, Currency: quote.Currency, Method: "demo_card"})
	if err != nil { return nil, err }
	confirmationCode := "SW-" + bookingID[len(bookingID)-8:]
	if err := server.store.SaveBooking(ctx, store.Booking{ID: bookingID, ConfirmationCode: confirmationCode, RoomID: request.RoomID, CheckIn: request.CheckIn, CheckOut: request.CheckOut, Guests: request.Guests, GuestName: request.GuestName, Email: request.Email, Amount: quote.TotalAmount, Currency: quote.Currency, PaymentID: payment.PaymentID, Status: payment.Status}); err != nil { return nil, err }
	return &rpc.CreateBookingResponse{BookingID: bookingID, ConfirmationCode: confirmationCode, Amount: quote.TotalAmount, Currency: quote.Currency, PaymentID: payment.PaymentID, Status: payment.Status}, nil
}

func restHandler(service *server) http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.Method != http.MethodPost || request.URL.Path != "/v1/bookings" { http.NotFound(writer, request); return }
		var payload rpc.CreateBookingRequest
		if err := json.NewDecoder(request.Body).Decode(&payload); err != nil { http.Error(writer, "invalid JSON", http.StatusBadRequest); return }
		response, err := service.CreateBooking(request.Context(), &payload)
		if err != nil { http.Error(writer, err.Error(), http.StatusBadRequest); return }
		writer.Header().Set("Content-Type", "application/json")
		json.NewEncoder(writer).Encode(response)
	})
}

func main() {
	secret := config.Env("JWT_SECRET", "change-me-in-production")
	database, err := store.Open(config.Env("DATABASE_URL", "postgres://staywise:staywise@localhost:5432/staywise?sslmode=disable"))
	if err != nil { log.Fatal(err) }
	defer database.Close()
	if err := database.EnsureSchema(context.Background()); err != nil { log.Fatal(err) }
	token, err := rpc.JWT(secret, "booking-service")
	if err != nil { log.Fatal(err) }
	calculatingConnection, err := grpc.Dial(config.Env("CALCULATING_ROOM_ADDR", "calculating-room:9002"), grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil { log.Fatal(err) }
	defer calculatingConnection.Close()
	paymentConnection, err := grpc.Dial(config.Env("PAYMENT_ADDR", "payment:9003"), grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil { log.Fatal(err) }
	defer paymentConnection.Close()
	listener, err := net.Listen("tcp", ":"+config.Env("PORT", "9001"))
	if err != nil { log.Fatal(err) }
	grpcServer := grpc.NewServer(grpc.UnaryInterceptor(rpc.UnaryJWTInterceptor(secret)))
	service := &server{calculatingRoom: rpc.NewCalculatingRoomClient(calculatingConnection), payment: rpc.NewPaymentClient(paymentConnection), serviceToken: token, store: database}
	rpc.RegisterBookingServer(grpcServer, service)
	go func() {
		if err := http.ListenAndServe(":"+config.Env("HTTP_PORT", "9101"), rpc.HTTPJWT(secret, restHandler(service))); err != nil { log.Fatal(err) }
	}()
	log.Printf("booking gRPC service listening on %s", listener.Addr())
	if err := grpcServer.Serve(listener); err != nil { log.Fatal(err) }
}