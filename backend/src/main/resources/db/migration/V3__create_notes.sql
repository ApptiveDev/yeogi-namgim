CREATE TABLE app.notes (
    id UUID PRIMARY KEY,
    guest_author_id UUID NOT NULL,
    content VARCHAR(500) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location public.geography(Point, 4326) GENERATED ALWAYS AS (
        public.ST_SetSRID(public.ST_MakePoint(longitude, latitude), 4326)::public.geography
    ) STORED,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_notes_guest_author
        FOREIGN KEY (guest_author_id) REFERENCES app.guest_sessions(id),
    CONSTRAINT chk_notes_latitude CHECK (latitude BETWEEN -90.0 AND 90.0),
    CONSTRAINT chk_notes_longitude CHECK (longitude BETWEEN -180.0 AND 180.0),
    CONSTRAINT chk_notes_content_not_blank CHECK (length(btrim(content)) > 0)
);

CREATE INDEX idx_notes_location ON app.notes USING GIST (location);
