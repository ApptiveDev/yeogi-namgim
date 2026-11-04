ALTER TABLE app.users ALTER COLUMN password_hash DROP NOT NULL;
CREATE TABLE app.kakao_accounts (
    kakao_id BIGINT PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES app.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL
);
