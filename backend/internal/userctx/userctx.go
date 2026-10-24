// Package userctx
package userctx

import (
	"context"
	"errors"
)

var ErrNoUser = errors.New("no authenticated user")

type key struct{}

func With(ctx context.Context, userID int64) context.Context {
	return context.WithValue(ctx, key{}, userID)
}

func ID(ctx context.Context) (int64, error) {
	id, ok := ctx.Value(key{}).(int64)
	if !ok {
		return 0, ErrNoUser
	}
	return id, nil
}
