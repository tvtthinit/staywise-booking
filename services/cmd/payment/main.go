package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"sync/atomic"

	"staywise/services/internal/config"
	"staywise/services/internal/rpc"
	"google.golang.org/grpc"
)

type server struct{ sequence uint64 }

func (server *server) ProcessPayment(_ context.Context, request *rpc.ProcessPaymentRequest) (*rpc.ProcessPaymentResponse, error) {
	if request.BookingID == "" || request.Amount <= 0 { return nil, grpc.Errorf(3, "booking_id and a positive amount are required") }
	paymentID := fmt.Sprintf("pay_%06d", atomic.AddUint64(&server.sequence, 1))
	return &rpc.ProcessPaymentResponse{PaymentID: paymentID, Status: "paid"}, nil
}

func restHandler(service *server) http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.Method != http.MethodPost || request.URL.Path != "/v1/payments" { http.NotFound(writer, request); return }
		var payload rpc.ProcessPaymentRequest
		if err := json.NewDecoder(request.Body).Decode(&payload); err != nil { http.Error(writer, "invalid JSON", http.StatusBadRequest); return }
		response, err := service.ProcessPayment(request.Context(), &payload)
		if err != nil { http.Error(writer, err.Error(), http.StatusBadRequest); return }
		writer.Header().Set("Content-Type", "application/json")
		json.NewEncoder(writer).Encode(response)
	})
}

func main() {
	secret := config.Env("JWT_SECRET", "change-me-in-production")
	listener, err := net.Listen("tcp", ":"+config.Env("PORT", "9003"))
	if err != nil { log.Fatal(err) }
	service := &server{}
	grpcServer := grpc.NewServer(grpc.UnaryInterceptor(rpc.UnaryJWTInterceptor(secret)))
	rpc.RegisterPaymentServer(grpcServer, service)
	go func() {
		if err := http.ListenAndServe(":"+config.Env("HTTP_PORT", "9103"), rpc.HTTPJWT(secret, restHandler(service))); err != nil { log.Fatal(err) }
	}()
	log.Printf("payment gRPC service listening on %s", listener.Addr())
	if err := grpcServer.Serve(listener); err != nil { log.Fatal(err) }
}