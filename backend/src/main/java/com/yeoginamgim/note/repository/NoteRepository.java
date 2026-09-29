package com.yeoginamgim.note.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.yeoginamgim.note.domain.Note;

public interface NoteRepository extends JpaRepository<Note, UUID> {
	@Query(value = """
		SELECT n.* FROM app.notes n
		WHERE n.id = :noteId
		  AND public.ST_DWithin(
		    n.location,
		    public.ST_SetSRID(public.ST_MakePoint(:longitude, :latitude), 4326)::public.geography,
		    200.0
		  )
		""", nativeQuery = true)
	Optional<Note> findOpenableById(
		@Param("noteId") UUID noteId,
		@Param("latitude") double latitude,
		@Param("longitude") double longitude
	);

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
