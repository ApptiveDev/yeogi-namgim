-- Legacy invitations retain their existing one-use behavior.
-- New shared codes must be retrievable by their authenticated owner.
ALTER TABLE app.friend_invitations ADD COLUMN share_code VARCHAR(6);
ALTER TABLE app.friend_invitations ADD CONSTRAINT chk_share_code
    CHECK (share_code IS NULL OR share_code ~ '^[A-HJ-NP-Z2-9]{6}$');
CREATE INDEX idx_friend_invitations_current
    ON app.friend_invitations (inviter_id, expires_at DESC) WHERE share_code IS NOT NULL;
