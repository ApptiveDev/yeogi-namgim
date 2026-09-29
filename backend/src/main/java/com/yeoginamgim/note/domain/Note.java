package com.yeoginamgim.note.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "notes", schema = "app")
public class Note {
	@Id
	private UUID id;

	@Column(name = "guest_author_id", nullable = false)
	private UUID guestAuthorId;

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
