CREATE TABLE app.note_discoveries (
    user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    note_id UUID NOT NULL REFERENCES app.notes(id) ON DELETE CASCADE,
    first_opened_at TIMESTAMPTZ NOT NULL,
    last_opened_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (user_id, note_id),
    CONSTRAINT chk_note_discovery_order CHECK (first_opened_at <= last_opened_at)
);

CREATE INDEX idx_note_discoveries_user_recent
    ON app.note_discoveries (user_id, last_opened_at DESC, note_id DESC);
