package com.yeoginamgim.auth.kakao;

import java.time.Clock;
import java.time.Instant;
import java.sql.Timestamp;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.yeoginamgim.auth.dto.AuthResponses.TokenPair;
import com.yeoginamgim.auth.service.AuthException;
import com.yeoginamgim.auth.service.MemberSessionService;

@Service
@ConditionalOnExpression("${auth.enabled:false} and ${auth.kakao.enabled:false}")
public class KakaoAuthService {
    private final KakaoIdentityClient kakao;
    private final JdbcTemplate jdbc;
    private final MemberSessionService sessions;
    private final Clock clock;
    public KakaoAuthService(KakaoIdentityClient kakao, JdbcTemplate jdbc, MemberSessionService sessions, Clock clock) {
        this.kakao = kakao; this.jdbc = jdbc; this.sessions = sessions; this.clock = clock;
    }
    @Transactional
    public TokenPair login(String token) {
        long id = kakao.verify(token, false).kakaoId();
        var ids = jdbc.query("SELECT user_id FROM app.kakao_accounts WHERE kakao_id = ?", (rs, n) -> rs.getObject(1, UUID.class), id);
        if (ids.isEmpty()) throw new AuthException(HttpStatus.NOT_FOUND, "KAKAO_ACCOUNT_NOT_LINKED", "연결된 계정이 없습니다. 가입하거나 기존 계정에 연결해 주세요.");
        return sessions.open(ids.getFirst());
    }
    @Transactional
    public TokenPair signup(String token, String nickname) {
        var identity = kakao.verify(token, true);
        UUID userId = UUID.randomUUID();
        Instant now = clock.instant();
        int inserted = jdbc.update("INSERT INTO app.users (id, email, password_hash, nickname, created_at) VALUES (?, ?, NULL, ?, ?) ON CONFLICT (email) DO NOTHING",
            userId, identity.verifiedEmail(), nickname, Timestamp.from(now));
        if (inserted == 0) throw new AuthException(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "이미 가입된 이메일입니다. 기존 계정으로 로그인 후 연결해 주세요.");
        if (jdbc.update("INSERT INTO app.kakao_accounts (kakao_id, user_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING",
            identity.kakaoId(), userId, Timestamp.from(now)) == 0)
            throw new AuthException(HttpStatus.CONFLICT, "KAKAO_ALREADY_LINKED", "이미 연결된 카카오 계정입니다.");
        return sessions.open(userId);
    }
    @Transactional
    public void link(UUID userId, String token) {
        long id = kakao.verify(token, false).kakaoId();
        int inserted = jdbc.update("INSERT INTO app.kakao_accounts (kakao_id, user_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING",
            id, userId, Timestamp.from(clock.instant()));
        if (inserted == 0) {
            var same = jdbc.queryForObject("SELECT count(*) FROM app.kakao_accounts WHERE kakao_id = ? AND user_id = ?", Long.class, id, userId);
            if (same == 0) throw new AuthException(HttpStatus.CONFLICT, "KAKAO_ALREADY_LINKED", "이미 연결된 계정이 있습니다.");
        }
    }
}
