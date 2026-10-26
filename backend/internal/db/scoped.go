package db

import (
	"context"
	"database/sql"

	"github.com/luizgustavojunqueira/blink/internal/userctx"
)

func nullUser(ctx context.Context) (sql.NullInt64, error) {
	id, err := userctx.ID(ctx)
	if err != nil {
		return sql.NullInt64{}, err
	}
	return sql.NullInt64{Int64: id, Valid: true}, nil
}

func (s *SQLStore) GetItem(ctx context.Context, id int64) (Item, error) {
	user, err := nullUser(ctx)
	if err != nil {
		return Item{}, err
	}
	return s.Queries.GetItem(ctx, GetItemParams{ID: id, UserID: user})
}

func (s *SQLStore) GetItemByGuid(ctx context.Context, guid string) (Item, error) {
	user, err := nullUser(ctx)
	if err != nil {
		return Item{}, err
	}
	return s.Queries.GetItemByGuid(ctx, GetItemByGuidParams{Guid: guid, UserID: user})
}

func (s *SQLStore) CreateItem(ctx context.Context, arg CreateItemParams) (Item, error) {
	userID, err := userctx.ID(ctx)
	if err != nil {
		return Item{}, err
	}
	arg.UserID = sql.NullInt64{Int64: userID, Valid: true}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return Item{}, err
	}
	defer func() { _ = tx.Rollback() }()

	item, err := s.WithTx(tx).CreateItem(ctx, arg)
	if err != nil {
		return Item{}, err
	}

	created := historyEntry{itemID: item.ID, field: "created", newValue: sql.NullString{String: item.Title, Valid: true}}
	if err := insertHistory(ctx, tx, userID, []historyEntry{created}); err != nil {
		return Item{}, err
	}

	return item, tx.Commit()
}

func (s *SQLStore) UpdateItem(ctx context.Context, arg UpdateItemParams) (Item, error) {
	userID, err := userctx.ID(ctx)
	if err != nil {
		return Item{}, err
	}
	arg.UserID = sql.NullInt64{Int64: userID, Valid: true}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return Item{}, err
	}
	defer func() { _ = tx.Rollback() }()

	before, err := loadStates(ctx, tx, userID, []string{arg.Guid})
	if err != nil {
		return Item{}, err
	}

	item, err := s.WithTx(tx).UpdateItem(ctx, arg)
	if err != nil {
		return Item{}, err
	}

	after, err := loadStates(ctx, tx, userID, []string{arg.Guid})
	if err != nil {
		return Item{}, err
	}

	if err := insertHistory(ctx, tx, userID, diffAll(before, mapValues(after))); err != nil {
		return Item{}, err
	}

	return item, tx.Commit()
}

func (s *SQLStore) ListItemHistory(ctx context.Context, guid string) ([]ListItemHistoryRow, error) {
	user, err := nullUser(ctx)
	if err != nil {
		return nil, err
	}
	return s.Queries.ListItemHistory(ctx, ListItemHistoryParams{Guid: guid, UserID: user})
}

func (s *SQLStore) GetTags(ctx context.Context) ([]string, error) {
	user, err := nullUser(ctx)
	if err != nil {
		return nil, err
	}
	return s.Queries.GetTags(ctx, user)
}

func (s *SQLStore) CreateAgent(ctx context.Context, arg CreateAgentParams) (Agent, error) {
	user, err := nullUser(ctx)
	if err != nil {
		return Agent{}, err
	}
	arg.UserID = user
	return s.Queries.CreateAgent(ctx, arg)
}

func (s *SQLStore) ListAgents(ctx context.Context) ([]Agent, error) {
	user, err := nullUser(ctx)
	if err != nil {
		return nil, err
	}
	return s.Queries.ListAgents(ctx, user)
}

func (s *SQLStore) DeleteAgent(ctx context.Context, guid string) (int64, error) {
	user, err := nullUser(ctx)
	if err != nil {
		return 0, err
	}
	return s.Queries.DeleteAgent(ctx, DeleteAgentParams{Guid: guid, UserID: user})
}

func (s *SQLStore) CreateUserAdoptingOrphans(ctx context.Context, arg CreateUserParams) (User, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return User{}, err
	}
	defer func() { _ = tx.Rollback() }()

	q := s.WithTx(tx)

	user, err := q.CreateUser(ctx, arg)
	if err != nil {
		return User{}, err
	}

	owner := sql.NullInt64{Int64: user.ID, Valid: true}
	if err := q.AdoptOrphanItems(ctx, owner); err != nil {
		return User{}, err
	}
	if err := q.AdoptOrphanAgents(ctx, owner); err != nil {
		return User{}, err
	}

	return user, tx.Commit()
}

func (s *SQLStore) DeleteUserData(ctx context.Context, userID int64) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	q := s.WithTx(tx)
	owner := sql.NullInt64{Int64: userID, Valid: true}

	if err := q.DeleteUserItems(ctx, owner); err != nil {
		return err
	}
	if err := q.DeleteUserAgents(ctx, owner); err != nil {
		return err
	}
	if err := q.DeleteUserSessions(ctx, userID); err != nil {
		return err
	}
	if err := q.DeleteUser(ctx, userID); err != nil {
		return err
	}

	return tx.Commit()
}
