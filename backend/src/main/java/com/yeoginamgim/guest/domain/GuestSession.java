package com.yeoginamgim.guest.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "guest_sessions", schema = "app")
public class GuestSession {
	@Id
	private UUID id;

	@Column(name = "token_hash", nullable = false, unique = true, length = 64)
	private String tokenHash;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	protected GuestSession() {
	}

	private GuestSession(UUID id, String tokenHash, Instant createdAt) {
		this.id = id;
		this.tokenHash = tokenHash;
		this.createdAt = createdAt;
	}

	public static GuestSession create(UUID id, String tokenHash, Instant createdAt) {
		return new GuestSession(id, tokenHash, createdAt);
	}

	public UUID getId() {
		return id;
	}

	public String getTokenHash() {
		return tokenHash;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}
}

