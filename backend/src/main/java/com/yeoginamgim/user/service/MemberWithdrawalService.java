package com.yeoginamgim.user.service;

import java.time.Clock;
import java.time.Instant;
import java.sql.Timestamp;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.yeoginamgim.auth.service.AuthException;

@Service
@ConditionalOnProperty(name = "auth.enabled", havingValue = "true")
public class MemberWithdrawalService {
    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwords;
    private final Clock clock;
    public MemberWithdrawalService(JdbcTemplate jdbc, PasswordEncoder passwords, Clock clock) {
        this.jdbc = jdbc; this.passwords = passwords; this.clock = clock;
    }
    @Transactional
    public void withdraw(UUID userId) {
        var emails = jdbc.query("SELECT email FROM app.users WHERE id = ? FOR UPDATE", (rs, row) -> rs.getString(1), userId);
        if (emails.isEmpty()) throw AuthException.unauthorized();
        // Until provider unlink is integrated, never silently delete a linked Kakao identity.
        Boolean kakaoTableExists = jdbc.queryForObject("SELECT to_regclass('app.kakao_accounts') IS NOT NULL", Boolean.class);
        if (Boolean.TRUE.equals(kakaoTableExists) && Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM app.kakao_accounts WHERE user_id = ?)", Boolean.class, userId))) {
            throw new AuthException(HttpStatus.CONFLICT, "KAKAO_UNLINK_REQUIRED", "카카오 연결 해제가 필요합니다.");
        }
        Long noteCount = jdbc.queryForObject("SELECT count(*) FROM app.notes WHERE author_user_id = ?", Long.class, userId);
        if (noteCount != null && noteCount > 0) {
            UUID anonymousId = UUID.randomUUID();
            Instant now = clock.instant();
            String syntheticEmail = anonymousId + "@withdrawn.invalid";
            String unusablePassword = passwords.encode(UUID.randomUUID().toString() + UUID.randomUUID());
            jdbc.update("INSERT INTO app.users (id, email, password_hash, nickname, created_at) VALUES (?, ?, ?, ?, ?)",
                anonymousId, syntheticEmail, unusablePassword, "탈퇴한 사용자", Timestamp.from(now));
            jdbc.update("UPDATE app.notes SET author_user_id = ? WHERE author_user_id = ?", anonymousId, userId);
        }
        jdbc.update("DELETE FROM app.email_verifications WHERE email = ?", emails.getFirst());
        jdbc.update("DELETE FROM app.users WHERE id = ?", userId);
    }
}
