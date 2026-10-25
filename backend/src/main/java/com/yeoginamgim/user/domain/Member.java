package com.yeoginamgim.user.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "users", schema = "app")
public class Member {

	@Id
	private UUID id;
	@Column(nullable = false, unique = true, length = 254)
	private String email;
	@Column(name = "password_hash", nullable = false, length = 100)
	private String passwordHash;
	@Column(nullable = false, length = 20)
	private String nickname;
	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	protected Member() { }

	public Member(UUID id, String email, String passwordHash, String nickname, Instant createdAt) {
		this.id = id;
		this.email = email;
		this.passwordHash = passwordHash;
		this.nickname = nickname;
		this.createdAt = createdAt;
	}

	public UUID getId() { return id; }
	public String getEmail() { return email; }
	public String getPasswordHash() { return passwordHash; }
	public String getNickname() { return nickname; }
	public Instant getCreatedAt() { return createdAt; }
}
