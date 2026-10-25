package com.yeoginamgim.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import javax.crypto.spec.SecretKeySpec;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.yeoginamgim.auth.dto.AuthResponses.TokenPair;
import com.yeoginamgim.auth.service.AccessTokenCodec;
import com.yeoginamgim.auth.service.AuthException;
import com.yeoginamgim.auth.service.MemberSessionService;
import com.yeoginamgim.auth.service.RefreshTokenCodec;
import com.yeoginamgim.auth.service.VerificationMailSender;
import com.yeoginamgim.user.domain.Member;
import com.yeoginamgim.user.repository.MemberRepository;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(properties = {
	"auth.enabled=true",
	"auth.jwt-secret=dGVzdC1qd3Qta2V5LXJlcGVhdC0zMi1ieXRlcy1vbmx5ISE=",
	"auth.verification-secret=dGVzdC1lbWFpbC1rZXktcmVwZWF0LTMyLWJ5dGVzLW9ubHk=",
	"auth.mail-from=noreply@example.test", "spring.mail.host=localhost"
})
class MemberSessionIntegrationTests {
	private static final String PASSWORD = "Session123!";
	private static final AtomicInteger NEXT_IP = new AtomicInteger();
	private final JsonMapper json = JsonMapper.builder().build();
	@Autowired private WebApplicationContext context;
	@Autowired private JdbcTemplate jdbc;
	@Autowired private MemberRepository members;
	@Autowired private PasswordEncoder passwords;
	@Autowired private MemberSessionService sessions;
	@Autowired private RefreshTokenCodec refreshTokens;
	@Autowired private AccessTokenCodec accessTokens;
	@MockitoBean private VerificationMailSender mail;
	private MockMvc mvc;
	private Member member;
	private String ip;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.webAppContextSetup(context).build();
		ip = "127.0.2." + NEXT_IP.incrementAndGet();
		member = members.saveAndFlush(new Member(UUID.randomUUID(), UUID.randomUUID() + "@example.test",
			passwords.encode(PASSWORD), "세션테스트", Instant.now()));
	}

	@Test
	void loginReturnsTokenPairAndStoresOnlyRefreshHash() throws Exception {
		JsonNode pair = login();
		String refresh = pair.get("refreshToken").asText();
		assertThat(pair.get("expiresIn").asLong()).isEqualTo(900);
		assertThat(pair.get("refreshExpiresIn").asLong()).isEqualTo(Duration.ofDays(14).toSeconds());
		assertThat(hash(refresh)).isEqualTo(refreshTokens.hash(refresh)).isNotEqualTo(refresh);
		assertThat(new TokenPair("secret-access", "Bearer", 900, "secret-refresh", 100).toString())
			.doesNotContain("secret-access", "secret-refresh");
		me(pair.get("accessToken").asText()).andExpect(status().isOk());
	}

	@Test
	void refreshRotatesTokenAndPreservesAbsoluteSessionExpiry() throws Exception {
		JsonNode first = login();
		String oldRefresh = first.get("refreshToken").asText();
		UUID id = sessionId(oldRefresh);
		var expiresAt = jdbc.queryForObject("SELECT expires_at FROM app.member_auth_sessions WHERE id = ?", java.sql.Timestamp.class, id);
		JsonNode next = data(tokenRequest("/refresh", oldRefresh).andExpect(status().isOk())
			.andExpect(header().string("Cache-Control", "no-store")));
		assertThat(next.get("refreshToken").asText()).isNotEqualTo(oldRefresh);
		assertThat(hash(oldRefresh)).isEqualTo(refreshTokens.hash(next.get("refreshToken").asText()));
		assertThat(jdbc.queryForObject("SELECT count(*) FROM app.used_refresh_tokens WHERE session_id = ? AND token_hash = ?",
			Integer.class, id, refreshTokens.hash(oldRefresh))).isEqualTo(1);
		assertThat(jdbc.queryForObject("SELECT expires_at FROM app.member_auth_sessions WHERE id = ?", java.sql.Timestamp.class, id))
			.isEqualTo(expiresAt);
		me(first.get("accessToken").asText()).andExpect(status().isOk());
		me(next.get("accessToken").asText()).andExpect(status().isOk());
	}

	@Test
	void replayRevokesWholeSessionAndCommitsRevocationDespiteError() throws Exception {
		JsonNode first = login();
		JsonNode other = login();
		String old = first.get("refreshToken").asText();
		JsonNode next = data(tokenRequest("/refresh", old).andExpect(status().isOk()));
		tokenRequest("/refresh", old).andExpect(status().isUnauthorized());
		assertThat(jdbc.queryForObject("SELECT revoked_at IS NOT NULL FROM app.member_auth_sessions WHERE id = ?",
			Boolean.class, sessionId(old))).isTrue();
		me(first.get("accessToken").asText()).andExpect(status().isUnauthorized());
		me(next.get("accessToken").asText()).andExpect(status().isUnauthorized());
		tokenRequest("/refresh", next.get("refreshToken").asText()).andExpect(status().isUnauthorized());
		me(other.get("accessToken").asText()).andExpect(status().isOk());
		tokenRequest("/refresh", other.get("refreshToken").asText()).andExpect(status().isOk());
	}

	@Test
	void randomSecretWithKnownSessionIdCannotRevokeLegitimateSession() throws Exception {
		JsonNode pair = login();
		String valid = pair.get("refreshToken").asText();
		String forged = valid.substring(0, 37) + refreshTokens.issue(UUID.randomUUID()).substring(37);
		tokenRequest("/refresh", forged).andExpect(status().isUnauthorized());
		tokenRequest("/logout", forged).andExpect(status().isOk());
		me(pair.get("accessToken").asText()).andExpect(status().isOk());
		tokenRequest("/refresh", valid).andExpect(status().isOk());
	}

	@Test
	void logoutIsIdempotentImmediatelyRevokesTokensAndPreservesOtherLogin() throws Exception {
		JsonNode first = login();
		JsonNode other = login();
		String refresh = first.get("refreshToken").asText();
		tokenRequest("/logout", refresh).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.loggedOut").value(true)).andExpect(header().string("Cache-Control", "no-store"));
		me(first.get("accessToken").asText()).andExpect(status().isUnauthorized());
		tokenRequest("/refresh", refresh).andExpect(status().isUnauthorized());
		tokenRequest("/logout", refresh).andExpect(status().isOk());
		tokenRequest("/logout", refreshTokens.issue(UUID.randomUUID())).andExpect(status().isOk());
		me(other.get("accessToken").asText()).andExpect(status().isOk());
		tokenRequest("/refresh", other.get("refreshToken").asText()).andExpect(status().isOk());
	}

	@Test
	void knownRetiredRefreshTokenCanStillLogOutItsSession() throws Exception {
		JsonNode first = login();
		String old = first.get("refreshToken").asText();
		JsonNode next = data(tokenRequest("/refresh", old).andExpect(status().isOk()));
		tokenRequest("/logout", old).andExpect(status().isOk());
		me(next.get("accessToken").asText()).andExpect(status().isUnauthorized());
		tokenRequest("/refresh", next.get("refreshToken").asText()).andExpect(status().isUnauthorized());
	}

	@Test
	void expiredSessionRejectsRefreshAndAccessButAllowsLogout() throws Exception {
		JsonNode pair = login();
		String refresh = pair.get("refreshToken").asText();
		jdbc.update("""
			UPDATE app.member_auth_sessions SET created_at = CURRENT_TIMESTAMP - INTERVAL '3 minutes',
			expires_at = CURRENT_TIMESTAMP - INTERVAL '1 minute' WHERE id = ?
			""", sessionId(refresh));
		tokenRequest("/refresh", refresh).andExpect(status().isUnauthorized());
		me(pair.get("accessToken").asText()).andExpect(status().isUnauthorized());
		tokenRequest("/logout", refresh).andExpect(status().isOk());
	}

	@Test
	void expiredAccessCanBeRenewedWithValidRefreshToken() throws Exception {
		JsonNode pair = login();
		var key = new SecretKeySpec(Base64.getDecoder().decode("dGVzdC1qd3Qta2V5LXJlcGVhdC0zMi1ieXRlcy1vbmx5ISE="), "HmacSHA256");
		var past = new AccessTokenCodec(key, "yeogi-namgim", Duration.ofMinutes(15),
			Clock.fixed(Instant.now().minusSeconds(901), ZoneOffset.UTC));
		String expired = past.issue(member.getId(), sessionId(pair.get("refreshToken").asText())).accessToken();
		me(expired).andExpect(status().isUnauthorized());
		JsonNode next = data(tokenRequest("/refresh", pair.get("refreshToken").asText()).andExpect(status().isOk()));
		me(next.get("accessToken").asText()).andExpect(status().isOk());
	}

	@Test
	void nearExpirySessionClampsNewAccessLifetime() throws Exception {
		JsonNode pair = login();
		String refresh = pair.get("refreshToken").asText();
		jdbc.update("UPDATE app.member_auth_sessions SET expires_at = CURRENT_TIMESTAMP + INTERVAL '1 minute' WHERE id = ?",
			sessionId(refresh));
		JsonNode next = data(tokenRequest("/refresh", refresh).andExpect(status().isOk()));
		assertThat(next.get("expiresIn").asLong()).isBetween(1L, 60L);
		assertThat(next.get("refreshExpiresIn").asLong()).isBetween(1L, 60L);
	}

	@Test
	void deletingMemberCascadesSessionAndRevokesTokens() throws Exception {
		JsonNode pair = login();
		String refresh = pair.get("refreshToken").asText();
		tokenRequest("/refresh", refresh).andExpect(status().isOk());
		members.deleteById(member.getId());
		assertThat(jdbc.queryForObject("SELECT count(*) FROM app.member_auth_sessions WHERE id = ?", Integer.class, sessionId(refresh))).isZero();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM app.used_refresh_tokens WHERE session_id = ?", Integer.class, sessionId(refresh))).isZero();
		me(pair.get("accessToken").asText()).andExpect(status().isUnauthorized());
		tokenRequest("/refresh", refresh).andExpect(status().isUnauthorized());
	}

	@Test
	void concurrentRefreshAllowsOneRotationAndDetectsReplay() throws Exception {
		String refresh = login().get("refreshToken").asText();
		CyclicBarrier barrier = new CyclicBarrier(2);
		try (var executor = Executors.newFixedThreadPool(2)) {
			Callable<TokenPair> task = () -> {
				barrier.await();
				try { return sessions.refresh(refresh); }
				catch (AuthException exception) { return null; }
			};
			var results = executor.invokeAll(List.of(task, task));
			TokenPair first = results.get(0).get();
			TokenPair second = results.get(1).get();
			assertThat(first == null ^ second == null).isTrue();
			TokenPair winner = first == null ? second : first;
			me(winner.accessToken()).andExpect(status().isUnauthorized());
			tokenRequest("/refresh", winner.refreshToken()).andExpect(status().isUnauthorized());
		}
		assertThat(jdbc.queryForObject("SELECT count(*) FROM app.used_refresh_tokens WHERE session_id = ?", Integer.class, sessionId(refresh)))
			.isEqualTo(1);
	}

	@Test
	void concurrentLogoutAndRefreshAlwaysEndSession() throws Exception {
		JsonNode pair = login();
		String refresh = pair.get("refreshToken").asText();
		CyclicBarrier barrier = new CyclicBarrier(2);
		try (var executor = Executors.newFixedThreadPool(2)) {
			Callable<TokenPair> renewing = () -> {
				barrier.await();
				try { return sessions.refresh(refresh); }
				catch (AuthException exception) { return null; }
			};
			Callable<TokenPair> logout = () -> { barrier.await(); sessions.logout(refresh); return null; };
			var results = executor.invokeAll(List.of(renewing, logout));
			TokenPair next = results.get(0).get();
			results.get(1).get();
			if (next != null) {
				me(next.accessToken()).andExpect(status().isUnauthorized());
				tokenRequest("/refresh", next.refreshToken()).andExpect(status().isUnauthorized());
			}
		}
		me(pair.get("accessToken").asText()).andExpect(status().isUnauthorized());
		tokenRequest("/refresh", refresh).andExpect(status().isUnauthorized());
	}

	@Test
	void rejectsMissingMalformedAndWrongTypeTokensWithoutRevokingSession() throws Exception {
		JsonNode pair = login();
		for (String path : List.of("/refresh", "/logout")) {
			for (String invalid : List.of("", "wrong-token", "x".repeat(43), pair.get("accessToken").asText())) {
				tokenRequest(path, invalid).andExpect(status().isBadRequest());
			}
			mvc.perform(post("/api/v1/auth" + path).contentType(MediaType.APPLICATION_JSON).content("{}"))
				.andExpect(status().isBadRequest());
		}
		me(pair.get("accessToken").asText()).andExpect(status().isOk());
	}

	@Test
	void rejectsSignedTokenWhoseSubjectDoesNotOwnSession() throws Exception {
		JsonNode pair = login();
		String differentUser = accessTokens.issue(UUID.randomUUID(), sessionId(pair.get("refreshToken").asText())).accessToken();
		me(differentUser).andExpect(status().isUnauthorized());
		me(pair.get("accessToken").asText()).andExpect(status().isOk());
	}

	@Test
	void rateLimitsRefreshRequests() throws Exception {
		String unknown = refreshTokens.issue(UUID.randomUUID());
		for (int i = 0; i < 30; i++) tokenRequest("/refresh", unknown).andExpect(status().isUnauthorized());
		tokenRequest("/refresh", unknown).andExpect(status().isTooManyRequests());
	}

	private UUID sessionId(String refresh) { return refreshTokens.parse(refresh).sessionId(); }
	private String hash(String refresh) {
		return jdbc.queryForObject("SELECT refresh_token_hash FROM app.member_auth_sessions WHERE id = ?", String.class, sessionId(refresh));
	}
	private JsonNode login() throws Exception {
		return data(mvc.perform(post("/api/v1/auth/login").with(request -> { request.setRemoteAddr(ip); return request; })
			.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("email", member.getEmail(), "password", PASSWORD))))
			.andExpect(status().isOk()));
	}
	private ResultActions tokenRequest(String path, String refresh) throws Exception {
		return mvc.perform(post("/api/v1/auth" + path).with(request -> { request.setRemoteAddr(ip); return request; })
			.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("refreshToken", refresh))));
	}
	private ResultActions me(String access) throws Exception {
		return mvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + access));
	}
	private JsonNode data(ResultActions response) throws Exception {
		return json.readTree(response.andReturn().getResponse().getContentAsString()).get("data");
	}
}
