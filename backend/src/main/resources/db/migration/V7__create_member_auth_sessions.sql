CREATE TABLE app.member_auth_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    refresh_token_hash CHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    CONSTRAINT chk_auth_session_expiry CHECK (expires_at > created_at)
);

CREATE INDEX idx_auth_sessions_user ON app.member_auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_expiry ON app.member_auth_sessions(expires_at);

CREATE TABLE app.used_refresh_tokens (
    session_id UUID NOT NULL REFERENCES app.member_auth_sessions(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL,
    used_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (session_id, token_hash)
);
