CREATE TABLE app.push_tokens (
    id UUID PRIMARY KEY,
    guest_id UUID NOT NULL REFERENCES app.guest_sessions(id),
    platform VARCHAR(10) NOT NULL CHECK (platform IN ('ANDROID', 'IOS')),
    push_token TEXT NOT NULL UNIQUE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_push_tokens_guest_id ON app.push_tokens (guest_id);
