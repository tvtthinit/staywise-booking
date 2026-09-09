package rpc

import (
	"context"

	"google.golang.org/grpc"
)

type CalculateRoomRequest struct {
	RoomID   int32  `json:"room_id"`
	CheckIn  string `json:"check_in"`
	CheckOut string `json:"check_out"`
	Guests   int32  `json:"guests"`
	Currency string `json:"currency"`
}

type CalculateRoomResponse struct {
	RoomID        int32  `json:"room_id"`
	Nights        int32  `json:"nights"`
	NightlyAmount int64  `json:"nightly_amount"`
	TotalAmount   int64  `json:"total_amount"`
	Currency      string `json:"currency"`
}

type CreateBookingRequest struct {
	RoomID   int32  `json:"room_id"`
	CheckIn  string `json:"check_in"`
	CheckOut string `json:"check_out"`
	Guests   int32  `json:"guests"`
	GuestName string `json:"guest_name"`
	Email    string `json:"email"`
	Currency string `json:"currency"`
}

type CreateBookingResponse struct {
	BookingID      string `json:"booking_id"`
	ConfirmationCode string `json:"confirmation_code"`
	Amount         int64  `json:"amount"`
	Currency       string `json:"currency"`
	PaymentID      string `json:"payment_id"`
	Status         string `json:"status"`
}

type ProcessPaymentRequest struct {
	BookingID string `json:"booking_id"`
	Amount    int64  `json:"amount"`
	Currency  string `json:"currency"`
	Method    string `json:"method"`
}

type ProcessPaymentResponse struct {
	PaymentID string `json:"payment_id"`
	Status    string `json:"status"`
}

type CalculateRoomServer interface {
	CalculateRoom(context.Context, *CalculateRoomRequest) (*CalculateRoomResponse, error)
}

func RegisterCalculateRoomServer(server *grpc.Server, implementation CalculateRoomServer) {
	server.RegisterService(&grpc.ServiceDesc{ServiceName: "staywise.calculatingroom.v1.CalculatingRoom", HandlerType: (*CalculateRoomServer)(nil), Methods: []grpc.MethodDesc{{MethodName: "CalculateRoom", Handler: calculateRoomHandler}}}, implementation)
}

func calculateRoomHandler(server any, ctx context.Context, decoder func(any) error, interceptor grpc.UnaryServerInterceptor) (any, error) {
	request := new(CalculateRoomRequest)
	if err := decoder(request); err != nil { return nil, err }
	handler := func(ctx context.Context, request any) (any, error) { return server.(CalculateRoomServer).CalculateRoom(ctx, request.(*CalculateRoomRequest)) }
	if interceptor == nil { return handler(ctx, request) }
	return interceptor(ctx, request, &grpc.UnaryServerInfo{Server: server, FullMethod: "/staywise.calculatingroom.v1.CalculatingRoom/CalculateRoom"}, handler)
}

type CalculatingRoomClient interface {
	CalculateRoom(context.Context, *CalculateRoomRequest, ...grpc.CallOption) (*CalculateRoomResponse, error)
}

type calculatingRoomClient struct{ connection grpc.ClientConnInterface }

func NewCalculatingRoomClient(connection grpc.ClientConnInterface) CalculatingRoomClient { return &calculatingRoomClient{connection} }

func (client *calculatingRoomClient) CalculateRoom(ctx context.Context, request *CalculateRoomRequest, options ...grpc.CallOption) (*CalculateRoomResponse, error) {
	response := new(CalculateRoomResponse)
	err := client.connection.Invoke(ctx, "/staywise.calculatingroom.v1.CalculatingRoom/CalculateRoom", request, response, append(options, grpc.ForceCodec(JSON{}))...)
	return response, err
}

type PaymentServer interface {
	ProcessPayment(context.Context, *ProcessPaymentRequest) (*ProcessPaymentResponse, error)
}

func RegisterPaymentServer(server *grpc.Server, implementation PaymentServer) {
	server.RegisterService(&grpc.ServiceDesc{ServiceName: "staywise.payment.v1.Payment", HandlerType: (*PaymentServer)(nil), Methods: []grpc.MethodDesc{{MethodName: "ProcessPayment", Handler: paymentHandler}}}, implementation)
}

func paymentHandler(server any, ctx context.Context, decoder func(any) error, interceptor grpc.UnaryServerInterceptor) (any, error) {
	request := new(ProcessPaymentRequest)
	if err := decoder(request); err != nil { return nil, err }
	handler := func(ctx context.Context, request any) (any, error) { return server.(PaymentServer).ProcessPayment(ctx, request.(*ProcessPaymentRequest)) }
	if interceptor == nil { return handler(ctx, request) }
	return interceptor(ctx, request, &grpc.UnaryServerInfo{Server: server, FullMethod: "/staywise.payment.v1.Payment/ProcessPayment"}, handler)
}

type PaymentClient interface {
	ProcessPayment(context.Context, *ProcessPaymentRequest, ...grpc.CallOption) (*ProcessPaymentResponse, error)
}

type paymentClient struct{ connection grpc.ClientConnInterface }

func NewPaymentClient(connection grpc.ClientConnInterface) PaymentClient { return &paymentClient{connection} }

func (client *paymentClient) ProcessPayment(ctx context.Context, request *ProcessPaymentRequest, options ...grpc.CallOption) (*ProcessPaymentResponse, error) {
	response := new(ProcessPaymentResponse)
	err := client.connection.Invoke(ctx, "/staywise.payment.v1.Payment/ProcessPayment", request, response, append(options, grpc.ForceCodec(JSON{}))...)
	return response, err
}

type BookingServer interface {
	CreateBooking(context.Context, *CreateBookingRequest) (*CreateBookingResponse, error)
}

func RegisterBookingServer(server *grpc.Server, implementation BookingServer) {
	server.RegisterService(&grpc.ServiceDesc{ServiceName: "staywise.booking.v1.Booking", HandlerType: (*BookingServer)(nil), Methods: []grpc.MethodDesc{{MethodName: "CreateBooking", Handler: bookingHandler}}}, implementation)
}

func bookingHandler(server any, ctx context.Context, decoder func(any) error, interceptor grpc.UnaryServerInterceptor) (any, error) {
	request := new(CreateBookingRequest)
	if err := decoder(request); err != nil { return nil, err }
	handler := func(ctx context.Context, request any) (any, error) { return server.(BookingServer).CreateBooking(ctx, request.(*CreateBookingRequest)) }
	if interceptor == nil { return handler(ctx, request) }
	return interceptor(ctx, request, &grpc.UnaryServerInfo{Server: server, FullMethod: "/staywise.booking.v1.Booking/CreateBooking"}, handler)
}