CREATE TABLE app.note_bookmarks (
    user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    note_id UUID NOT NULL REFERENCES app.notes(id) ON DELETE CASCADE,
    saved_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (user_id, note_id)
);

CREATE INDEX idx_note_bookmarks_user_saved
    ON app.note_bookmarks (user_id, saved_at DESC, note_id DESC);
