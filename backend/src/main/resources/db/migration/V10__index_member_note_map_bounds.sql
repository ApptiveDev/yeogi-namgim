-- Map viewports are longitude/latitude rectangles, including views wider than a hemisphere.
-- Index the geometry expression rather than interpreting the viewport as a geography polygon.
CREATE INDEX idx_notes_member_map_bounds
    ON app.notes USING GIST ((location::public.geometry))
    WHERE author_user_id IS NOT NULL;
