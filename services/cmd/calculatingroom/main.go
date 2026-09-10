package main

import (
	"context"
	"encoding/json"
	"log"
	"net"
	"net/http"
	"time"

	"staywise/services/internal/config"
	"staywise/services/internal/rpc"
	"staywise/services/internal/store"
	"google.golang.org/grpc"
)

type server struct{ store *store.Store }

func (server server) CalculateRoom(ctx context.Context, request *rpc.CalculateRoomRequest) (*rpc.CalculateRoomResponse, error) {
	checkIn, err := time.Parse("2006-01-02", request.CheckIn)
	if err != nil { return nil, err }
	checkOut, err := time.Parse("2006-01-02", request.CheckOut)
	if err != nil { return nil, err }
	nights := int32(checkOut.Sub(checkIn).Hours() / 24)
	if nights < 1 { return nil, grpc.Errorf(3, "check_out must be after check_in") }
	nightlyAmount, err := server.store.NightlyAmount(ctx, request.RoomID)
	if err != nil { return nil, err }
	currency := request.Currency
	if currency == "" { currency = "USD" }
	return &rpc.CalculateRoomResponse{RoomID: request.RoomID, Nights: nights, NightlyAmount: nightlyAmount, TotalAmount: nightlyAmount * int64(nights), Currency: currency}, nil
}

func restHandler(service server) http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.Method != http.MethodPost || request.URL.Path != "/v1/room-calculations" { http.NotFound(writer, request); return }
		var payload rpc.CalculateRoomRequest
		if err := json.NewDecoder(request.Body).Decode(&payload); err != nil { http.Error(writer, "invalid JSON", http.StatusBadRequest); return }
		response, err := service.CalculateRoom(request.Context(), &payload)
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
	listener, err := net.Listen("tcp", ":"+config.Env("PORT", "9002"))
	if err != nil { log.Fatal(err) }
	service := server{store: database}
	grpcServer := grpc.NewServer(grpc.UnaryInterceptor(rpc.UnaryJWTInterceptor(secret)))
	rpc.RegisterCalculateRoomServer(grpcServer, service)
	go func() {
		if err := http.ListenAndServe(":"+config.Env("HTTP_PORT", "9102"), rpc.HTTPJWT(secret, restHandler(service))); err != nil { log.Fatal(err) }
	}()
	log.Printf("calculating-room gRPC service listening on %s", listener.Addr())
	if err := grpcServer.Serve(listener); err != nil { log.Fatal(err) }
}