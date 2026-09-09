package rpc

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

type contextKey string

const subjectKey contextKey = "subject"

func UnaryJWTInterceptor(secret string) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, request any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
		token, err := bearerToken(ctx)
		if err != nil {
			return nil, status.Error(codes.Unauthenticated, err.Error())
		}

		if err := ValidateJWT(secret, token); err != nil {
			return nil, status.Error(codes.Unauthenticated, "invalid bearer token")
		}

		return handler(context.WithValue(ctx, subjectKey, claims["sub"]), request)
	}
}

func bearerToken(ctx context.Context) (string, error) {
	values := metadata.ValueFromIncomingContext(ctx, "authorization")
	if len(values) == 0 || !strings.HasPrefix(strings.ToLower(values[0]), "bearer ") {
		return "", errors.New("authorization bearer token is required")
	}
	return strings.TrimSpace(values[0][7:]), nil
}

func JWT(secret, subject string) (string, error) {
	return jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"sub": subject}).SignedString([]byte(secret))
}

func WithBearer(ctx context.Context, token string) context.Context {
	return metadata.AppendToOutgoingContext(ctx, "authorization", "Bearer "+token)
}

func ValidateJWT(secret, token string) error {
	claims := jwt.MapClaims{}
	parsed, err := jwt.ParseWithClaims(token, claims, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(secret), nil
	})
	if err != nil || !parsed.Valid { return errors.New("invalid bearer token") }
	return nil
}

func HTTPJWT(secret string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		header := request.Header.Get("Authorization")
		if !strings.HasPrefix(strings.ToLower(header), "bearer ") || ValidateJWT(secret, strings.TrimSpace(header[7:])) != nil {
			http.Error(writer, "invalid bearer token", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(writer, request)
	})
}