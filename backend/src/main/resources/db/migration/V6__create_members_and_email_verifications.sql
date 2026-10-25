CREATE TABLE app.users (
    id UUID PRIMARY KEY,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    nickname VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_users_email_normalized CHECK (email = lower(btrim(email))),
    CONSTRAINT chk_users_nickname CHECK (char_length(btrim(nickname)) BETWEEN 2 AND 20)
);

CREATE TABLE app.email_verifications (
    email VARCHAR(254) PRIMARY KEY,
    verification_id UUID NOT NULL,
    code_hash CHAR(64) NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
    verification_token_hash CHAR(64),
    verified_until TIMESTAMPTZ,
    CONSTRAINT chk_verification_token_pair CHECK (
        (verification_token_hash IS NULL) = (verified_until IS NULL)
    )
);
