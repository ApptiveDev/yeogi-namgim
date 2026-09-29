package com.yeoginamgim.push.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "push_tokens", schema = "app")
public class PushToken {
	@Id
	private UUID id;
	@Column(name = "guest_id", nullable = false)
	private UUID guestId;
	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 10)
	private PushPlatform platform;
	@Column(name = "push_token", nullable = false, columnDefinition = "text")
	private String pushToken;
	@Column(nullable = false)
	private boolean enabled;
	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	protected PushToken() {
	}

	private PushToken(UUID id, UUID guestId, PushPlatform platform, String pushToken, Instant createdAt) {
		this.id = id;
		this.guestId = guestId;
		this.platform = platform;
		this.pushToken = pushToken;
		this.enabled = true;
		this.createdAt = createdAt;
	}

	public static PushToken create(UUID id, UUID guestId, PushPlatform platform, String pushToken, Instant createdAt) {
		return new PushToken(id, guestId, platform, pushToken, createdAt);
	}

	public void setEnabled(boolean enabled) {
		this.enabled = enabled;
	}

	public void setPlatform(PushPlatform platform) {
		this.platform = platform;
	}

	public UUID getId() { return id; }
	public UUID getGuestId() { return guestId; }
	public PushPlatform getPlatform() { return platform; }
	public String getPushToken() { return pushToken; }
	public boolean isEnabled() { return enabled; }
	public Instant getCreatedAt() { return createdAt; }
}
