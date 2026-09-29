package com.yeoginamgim.push.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.yeoginamgim.push.domain.PushToken;

public interface PushTokenRepository extends JpaRepository<PushToken, UUID> {
	Optional<PushToken> findByPushToken(String pushToken);
}
