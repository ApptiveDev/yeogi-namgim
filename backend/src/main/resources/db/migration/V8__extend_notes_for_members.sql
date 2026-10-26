ALTER TABLE app.notes
    ALTER COLUMN guest_author_id DROP NOT NULL,
    ADD COLUMN author_user_id UUID REFERENCES app.users(id),
    ADD COLUMN visibility VARCHAR(16) NOT NULL DEFAULT 'PUBLIC',
    ADD COLUMN color VARCHAR(32),
    ADD COLUMN place_name VARCHAR(200),
    ADD COLUMN neighborhood VARCHAR(100),
    ADD CONSTRAINT chk_notes_exactly_one_author CHECK (
        (guest_author_id IS NOT NULL) <> (author_user_id IS NOT NULL)
    ),
    ADD CONSTRAINT chk_notes_visibility CHECK (visibility IN ('PUBLIC', 'FRIENDS', 'PRIVATE')),
    ADD CONSTRAINT chk_notes_guest_public CHECK (guest_author_id IS NULL OR visibility = 'PUBLIC'),
    ADD CONSTRAINT chk_notes_color CHECK (
        color IS NULL OR color ~ '^(#[0-9A-Fa-f]{6}|[A-Za-z][A-Za-z0-9_-]{0,31})$'
    );

CREATE INDEX idx_notes_member_created ON app.notes (author_user_id, created_at DESC, id DESC)
    WHERE author_user_id IS NOT NULL;
