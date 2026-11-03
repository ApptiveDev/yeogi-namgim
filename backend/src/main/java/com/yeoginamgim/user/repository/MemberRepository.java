package com.yeoginamgim.user.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.yeoginamgim.user.domain.Member;

public interface MemberRepository extends JpaRepository<Member, UUID> {
	Optional<Member> findByEmail(String email);
	boolean existsByEmail(String email);

	@Modifying(flushAutomatically = true, clearAutomatically = true)
	@Query("update Member m set m.nickname = :nickname where m.id = :userId")
	int updateNickname(@Param("userId") UUID userId, @Param("nickname") String nickname);
}
