CREATE TABLE app.guest_locations (
    guest_id UUID PRIMARY KEY REFERENCES app.guest_sessions(id),
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90.0 AND 90.0),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180.0 AND 180.0),
    location public.geography(Point, 4326) GENERATED ALWAYS AS (
        public.ST_SetSRID(public.ST_MakePoint(longitude, latitude), 4326)::public.geography
    ) STORED,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_guest_locations_location ON app.guest_locations USING GIST (location);

CREATE TABLE app.push_deliveries (
    token_id UUID NOT NULL REFERENCES app.push_tokens(id) ON DELETE CASCADE,
    region_key VARCHAR(12) NOT NULL,
    hour_bucket TIMESTAMPTZ NOT NULL,
    delivered_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (token_id, region_key, hour_bucket)
);
