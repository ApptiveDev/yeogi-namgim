package com.yeoginamgim.guest.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.yeoginamgim.guest.domain.GuestSession;

public interface GuestSessionRepository extends JpaRepository<GuestSession, UUID> {
	Optional<GuestSession> findByTokenHash(String tokenHash);
}

