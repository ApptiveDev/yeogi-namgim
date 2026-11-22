ALTER TABLE app.notes
    ADD COLUMN tag VARCHAR(16),
    ADD CONSTRAINT chk_notes_tag CHECK (
        tag IS NULL OR tag IN ('RESTAURANT', 'CAFE', 'MEMORY', 'WORRY', 'TOUCHED', 'DAILY')
    );

CREATE INDEX idx_notes_public_tag_location ON app.notes USING GIST (location)
    WHERE author_user_id IS NOT NULL AND visibility = 'PUBLIC' AND tag IS NOT NULL;
