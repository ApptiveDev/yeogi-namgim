package com.yeoginamgim.note.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "notes", schema = "app")
public class Note {
	@Id
	private UUID id;

	@Column(name = "guest_author_id")
	private UUID guestAuthorId;

	@Column(name = "author_user_id")
	private UUID authorUserId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 16)
	private NoteVisibility visibility = NoteVisibility.PUBLIC;

	@Column(length = 32)
	private String color;

	@Column(name = "place_name", length = 200)
	private String placeName;

	@Column(length = 100)
	private String neighborhood;

	@Column(nullable = false, length = 500)
	private String content;

	@Column(nullable = false)
	private double latitude;

	@Column(nullable = false)
	private double longitude;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	protected Note() {
	}

	private Note(
		UUID id,
		UUID guestAuthorId,
		String content,
		double latitude,
		double longitude,
		Instant createdAt
	) {
		this.id = id;
		this.guestAuthorId = guestAuthorId;
		this.content = content;
		this.latitude = latitude;
		this.longitude = longitude;
		this.createdAt = createdAt;
	}

	public static Note create(
		UUID id,
		UUID guestAuthorId,
		String content,
		double latitude,
		double longitude,
		Instant createdAt
	) {
		return new Note(id, guestAuthorId, content, latitude, longitude, createdAt);
	}

	public UUID getId() {
		return id;
	}

	public static Note createMember(UUID id, UUID authorUserId, String content,
		double latitude, double longitude, Instant createdAt, NoteVisibility visibility,
		String color, String placeName, String neighborhood) {
		Note note = new Note(id, null, content, latitude, longitude, createdAt);
		note.authorUserId = java.util.Objects.requireNonNull(authorUserId);
		note.visibility = java.util.Objects.requireNonNull(visibility);
		note.color = color;
		note.placeName = placeName;
		note.neighborhood = neighborhood;
		return note;
	}

	public UUID getAuthorUserId() { return authorUserId; }
	public NoteVisibility getVisibility() { return visibility; }
	public String getColor() { return color; }
	public String getPlaceName() { return placeName; }
	public String getNeighborhood() { return neighborhood; }

	public UUID getGuestAuthorId() {
		return guestAuthorId;
	}

	public String getContent() {
		return content;
	}

	public double getLatitude() {
		return latitude;
	}

	public double getLongitude() {
		return longitude;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}
}
