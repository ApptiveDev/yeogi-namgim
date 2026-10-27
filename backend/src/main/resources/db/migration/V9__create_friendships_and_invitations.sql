CREATE TABLE app.friend_invitations (
    id UUID PRIMARY KEY,
    inviter_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    code_hash CHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_by UUID REFERENCES app.users(id) ON DELETE CASCADE,
    accepted_at TIMESTAMPTZ,
    CONSTRAINT chk_invitation_expiry CHECK (expires_at > created_at),
    CONSTRAINT chk_invitation_acceptance CHECK ((accepted_by IS NULL) = (accepted_at IS NULL)),
    CONSTRAINT chk_invitation_not_self CHECK (accepted_by IS NULL OR accepted_by <> inviter_id)
);

CREATE INDEX idx_friend_invitations_inviter ON app.friend_invitations (inviter_id);
CREATE INDEX idx_friend_invitations_accepted_by ON app.friend_invitations (accepted_by)
    WHERE accepted_by IS NOT NULL;

CREATE TABLE app.friendships (
    user_low UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    user_high UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (user_low, user_high),
    CONSTRAINT chk_friendship_order CHECK (user_low < user_high)
);

CREATE INDEX idx_friendships_high ON app.friendships (user_high, created_at DESC, user_low DESC);
