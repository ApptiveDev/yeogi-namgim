package com.yeoginamgim.note.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.yeoginamgim.note.domain.Note;

public interface NoteRepository extends JpaRepository<Note, UUID> {
	@Query(value = """
		SELECT
			n.id AS "noteId",
			n.latitude AS "latitude",
			n.longitude AS "longitude",
			n.guest_author_id AS "guestAuthorId"
		FROM app.notes n
		WHERE n.location && public.ST_MakeEnvelope(
			:minLongitude,
			:minLatitude,
			:maxLongitude,
			:maxLatitude,
			4326
		)::public.geography
		ORDER BY n.created_at DESC, n.id
		""", nativeQuery = true)
	List<NoteMarkerProjection> findMarkersWithinBounds(
		@Param("minLatitude") double minLatitude,
		@Param("minLongitude") double minLongitude,
		@Param("maxLatitude") double maxLatitude,
		@Param("maxLongitude") double maxLongitude
	);
}
