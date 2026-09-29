package com.yeoginamgim.location.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "guest_locations", schema = "app")
public class GuestLocation {
	@Id
	@Column(name = "guest_id")
	private UUID guestId;
	@Column(nullable = false)
	private double latitude;
	@Column(nullable = false)
	private double longitude;
	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	protected GuestLocation() {
	}

	public GuestLocation(UUID guestId, double latitude, double longitude, Instant updatedAt) {
		this.guestId = guestId;
		update(latitude, longitude, updatedAt);
	}

	public void update(double latitude, double longitude, Instant updatedAt) {
		this.latitude = latitude;
		this.longitude = longitude;
		this.updatedAt = updatedAt;
	}

	public double getLatitude() { return latitude; }
	public double getLongitude() { return longitude; }
	public Instant getUpdatedAt() { return updatedAt; }
}
