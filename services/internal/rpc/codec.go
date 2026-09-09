package rpc

import (
	"encoding/json"

	"google.golang.org/grpc/encoding"
)

// JSON keeps the contract readable while allowing the services to share typed
// Go messages without requiring protoc on every developer machine.
type JSON struct{}

func (JSON) Name() string { return "json" }

func (JSON) Marshal(value any) ([]byte, error) { return json.Marshal(value) }

func (JSON) Unmarshal(data []byte, value any) error { return json.Unmarshal(data, value) }

func init() { encoding.RegisterCodec(JSON{}) }