package com.yeoginamgim.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.yeoginamgim.auth.dto.AuthRequests.SignupRequest;
import com.yeoginamgim.auth.service.AccessTokenCodec;
import com.yeoginamgim.auth.service.AuthException;
import com.yeoginamgim.auth.service.MemberAuthService;
import com.yeoginamgim.auth.service.VerificationMailSender;
import com.yeoginamgim.user.repository.MemberRepository;

import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(properties = {
	"auth.enabled=true",
	"auth.jwt-secret=dGVzdC1qd3Qta2V5LXJlcGVhdC0zMi1ieXRlcy1vbmx5ISE=",
	"auth.verification-secret=dGVzdC1lbWFpbC1rZXktcmVwZWF0LTMyLWJ5dGVzLW9ubHk=",
	"auth.mail-from=noreply@example.test", "spring.mail.host=localhost"
})
class AuthFlowIntegrationTests {
	private static final String PASSWORD = "Valid123!";
	private static final AtomicInteger NEXT_IP = new AtomicInteger();
	private final JsonMapper json = JsonMapper.builder().build();
	@Autowired private WebApplicationContext context;
	@Autowired private JdbcTemplate jdbc;
	@Autowired private MemberRepository members;
	@Autowired private PasswordEncoder passwords;
	@Autowired private AccessTokenCodec tokens;
	@Autowired private MemberAuthService auth;
	@MockitoBean private VerificationMailSender mail;
	private MockMvc mvc;
	private String ip;
	private final Map<String, String> verificationIds = new HashMap<>();

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.webAppContextSetup(context).build();
		ip = "127.0.1." + NEXT_IP.incrementAndGet();
	}

	@Test
	void verifiesSignsUpLogsInAndRetrievesProfileWithoutLeakingSecrets() throws Exception {
		String email = email();
		String verificationToken = verified(email);
		String profile = signup(email, verificationToken, PASSWORD, PASSWORD).andExpect(status().isCreated())
			.andExpect(jsonPath("$.data.passwordHash").doesNotExist())
			.andExpect(jsonPath("$.data.password").doesNotExist()).andReturn().getResponse().getContentAsString();
		String userId = json.readTree(profile).at("/data/userId").asText();
		var member = members.findByEmail(email).orElseThrow();
		assertThat(member.getPasswordHash()).isNotEqualTo(PASSWORD);
		assertThat(passwords.matches(PASSWORD, member.getPasswordHash())).isTrue();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM app.email_verifications WHERE email = ?", Integer.class, email)).isZero();
		String login = mvc.perform(body("/api/v1/auth/login", Map.of("email", " " + email.toUpperCase() + " ", "password", PASSWORD)))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.expiresIn").value(900))
			.andExpect(header().string("Cache-Control", "no-store"))
			.andReturn().getResponse().getContentAsString();
		String accessToken = json.readTree(login).at("/data/accessToken").asText();
		mvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + accessToken))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.userId").value(userId))
			.andExpect(jsonPath("$.data.email").value(email));
		mvc.perform(body("/api/v1/auth/login", Map.of("email", email, "password", "Wrong123!")))
			.andExpect(status().isUnauthorized());
		mvc.perform(body("/api/v1/auth/login", Map.of("email", email(), "password", PASSWORD)))
			.andExpect(status().isUnauthorized());
		// A second verification cannot bypass normalized email uniqueness.
		signup(email.toUpperCase(), "x".repeat(43), PASSWORD, PASSWORD)
			.andExpect(status().isConflict()).andExpect(jsonPath("$.error.code").value("EMAIL_ALREADY_EXISTS"));
	}

	@Test
	void invalidPasswordOrConfirmationDoesNotConsumeVerifiedEmail() throws Exception {
		String email = email();
		String verificationToken = verified(email);
		for (String invalid : List.of("short1!", "NoNumbers!", "NoSpecial123", "No Letters1! ", "Ab1!" + "a".repeat(61))) {
			signup(email, verificationToken, invalid, invalid).andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"));
		}
		// Use a new remote IP because signup attempts are rate-limited separately.
		ip = "127.0.1." + NEXT_IP.incrementAndGet();
		signup(email, verificationToken, PASSWORD, "Different1!").andExpect(status().isBadRequest());
		signup(email, verificationToken, PASSWORD, PASSWORD).andExpect(status().isCreated());
	}

	@Test
	void persistsFailedAttemptsAndRejectsCorrectCodeAfterFiveFailures() throws Exception {
		String email = email();
		String code = requested(email);
		String wrong = code.equals("000000") ? "000001" : "000000";
		for (int i = 0; i < 5; i++) {
			confirm(email, wrong).andExpect(status().isBadRequest());
		}
		assertThat(jdbc.queryForObject("SELECT attempts FROM app.email_verifications WHERE email = ?", Integer.class, email)).isEqualTo(5);
		confirm(email, code).andExpect(status().isBadRequest());
	}

	@Test
	void rejectsExpiredCodesResendsAndInvalidatesPreviousCodeAndGrant() throws Exception {
		String email = email();
		String oldCode = requested(email);
		String oldId = verificationIds.get(email);
		mvc.perform(body("/api/v1/auth/email-verifications", Map.of("email", email)))
			.andExpect(status().isTooManyRequests());
		jdbc.update("UPDATE app.email_verifications SET expires_at = CURRENT_TIMESTAMP - INTERVAL '1 second' WHERE email = ?", email);
		confirm(email, oldCode).andExpect(status().isBadRequest());
		jdbc.update("UPDATE app.email_verifications SET requested_at = CURRENT_TIMESTAMP - INTERVAL '61 seconds' WHERE email = ?", email);
		String resent = mvc.perform(body("/api/v1/auth/email-verifications", Map.of("email", email)))
			.andExpect(status().isAccepted()).andReturn().getResponse().getContentAsString();
		verificationIds.put(email, json.readTree(resent).at("/data/verificationId").asText());
		// The request creates a new verification identity even if the random digits happen to match.
		var codes = ArgumentCaptor.forClass(String.class);
		verify(mail, org.mockito.Mockito.times(2)).sendCode(eq(email), codes.capture());
		String newCode = codes.getAllValues().get(1);
		mvc.perform(body("/api/v1/auth/email-verifications/confirm", Map.of("email", email,
			"verificationId", oldId, "code", oldCode))).andExpect(status().isBadRequest());
		String response = confirm(email, newCode).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
		String grant = json.readTree(response).at("/data/verificationToken").asText();
		confirm(email, newCode).andExpect(status().isBadRequest());
		jdbc.update("UPDATE app.email_verifications SET requested_at = CURRENT_TIMESTAMP - INTERVAL '61 seconds' WHERE email = ?", email);
		mvc.perform(body("/api/v1/auth/email-verifications", Map.of("email", email))).andExpect(status().isAccepted());
		signup(email, grant, PASSWORD, PASSWORD).andExpect(status().isBadRequest());
	}

	@Test
	void rejectsUnverifiedExpiredOrCrossEmailSignupGrants() throws Exception {
		String email = email();
		signup(email, "x".repeat(43), PASSWORD, PASSWORD).andExpect(status().isBadRequest());
		String grant = verified(email);
		signup(email(), grant, PASSWORD, PASSWORD).andExpect(status().isBadRequest());
		jdbc.update("UPDATE app.email_verifications SET verified_until = CURRENT_TIMESTAMP - INTERVAL '1 second' WHERE email = ?", email);
		signup(email, grant, PASSWORD, PASSWORD).andExpect(status().isBadRequest());
	}

	@Test
	void concurrentSignupConsumesGrantExactlyOnce() throws Exception {
		String email = email();
		String grant = verified(email);
		SignupRequest request = new SignupRequest(email, PASSWORD, PASSWORD, "동시가입", grant);
		try (var executor = Executors.newFixedThreadPool(2)) {
			var tasks = List.<java.util.concurrent.Callable<Boolean>>of(() -> trySignup(request), () -> trySignup(request));
			var results = executor.invokeAll(tasks);
			assertThat(List.of(results.get(0).get(), results.get(1).get())).containsExactlyInAnyOrder(true, false);
		}
		assertThat(jdbc.queryForObject("SELECT count(*) FROM app.users WHERE email = ?", Integer.class, email)).isEqualTo(1);
	}

	@Test
	void mailFailureRollsBackReservationAndNeverReturnsCode() throws Exception {
		String email = email();
		doThrow(new AuthException(HttpStatus.SERVICE_UNAVAILABLE, "EMAIL_SEND_FAILED", "발송 실패"))
			.when(mail).sendCode(eq(email), org.mockito.ArgumentMatchers.anyString());
		mvc.perform(body("/api/v1/auth/email-verifications", Map.of("email", email)))
			.andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.data").doesNotExist());
		assertThat(jdbc.queryForObject("SELECT count(*) FROM app.email_verifications WHERE email = ?", Integer.class, email)).isZero();
	}

	@Test
	void memberAndGuestTokensCannotBeUsedInterchangeablyAndDeletedMembersAreRejected() throws Exception {
		mvc.perform(get("/api/v1/users/me")).andExpect(status().isUnauthorized());
		String response = mvc.perform(post("/api/v1/guest-sessions")).andExpect(status().isCreated())
			.andReturn().getResponse().getContentAsString();
		String guestToken = json.readTree(response).at("/data/guestToken").asText();
		mvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + guestToken)).andExpect(status().isUnauthorized());
		String memberToken = tokens.issue(UUID.randomUUID(), UUID.randomUUID()).accessToken();
		mvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + memberToken)).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/v1/notes").header("Authorization", "Bearer " + memberToken)
			.param("minLatitude", "35.17").param("maxLatitude", "35.19")
			.param("minLongitude", "129.06").param("maxLongitude", "129.09")).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/v1/notes").header("Authorization", "Bearer " + guestToken)
			.param("minLatitude", "35.17").param("maxLatitude", "35.19")
			.param("minLongitude", "129.06").param("maxLongitude", "129.09")).andExpect(status().isOk());
	}

	@Test
	void limitsLoginAttemptsPerEmail() throws Exception {
		String email = email();
		for (int i = 0; i < 10; i++) {
			mvc.perform(body("/api/v1/auth/login", Map.of("email", email, "password", PASSWORD))).andExpect(status().isUnauthorized());
		}
		mvc.perform(body("/api/v1/auth/login", Map.of("email", email, "password", PASSWORD))).andExpect(status().isTooManyRequests());
	}

	private boolean trySignup(SignupRequest request) {
		try { auth.signup(request); return true; }
		catch (AuthException exception) { return false; }
	}
	private String requested(String email) throws Exception {
		String response = mvc.perform(body("/api/v1/auth/email-verifications", Map.of("email", email)))
			.andExpect(status().isAccepted()).andExpect(jsonPath("$.data.code").doesNotExist())
			.andReturn().getResponse().getContentAsString();
		assertThat(json.readTree(response).at("/data/expiresIn").asInt()).isEqualTo(300);
		verificationIds.put(email, json.readTree(response).at("/data/verificationId").asText());
		var code = ArgumentCaptor.forClass(String.class);
		verify(mail).sendCode(eq(email), code.capture());
		assertThat(jdbc.queryForObject("SELECT code_hash FROM app.email_verifications WHERE email = ?", String.class, email))
			.hasSize(64).isNotEqualTo(code.getValue());
		return code.getValue();
	}
	private String verified(String email) throws Exception {
		String response = confirm(email, requested(email)).andExpect(status().isOk())
			.andReturn().getResponse().getContentAsString();
		String token = json.readTree(response).at("/data/verificationToken").asText();
		assertThat(jdbc.queryForObject("SELECT verification_token_hash FROM app.email_verifications WHERE email = ?", String.class, email))
			.isNotEqualTo(token);
		return token;
	}
	private org.springframework.test.web.servlet.ResultActions confirm(String email, String code) throws Exception {
		return mvc.perform(body("/api/v1/auth/email-verifications/confirm", Map.of("email", email,
			"verificationId", verificationIds.get(email), "code", code)));
	}
	private org.springframework.test.web.servlet.ResultActions signup(String email, String token, String password, String confirm) throws Exception {
		return mvc.perform(body("/api/v1/auth/signup", Map.of("email", email, "password", password,
			"passwordConfirm", confirm, "nickname", "테스트회원", "verificationToken", token)));
	}
	private MockHttpServletRequestBuilder body(String path, Object value) throws Exception {
		return post(path).with(request -> { request.setRemoteAddr(ip); return request; })
			.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(value));
	}
	private String email() { return UUID.randomUUID() + "@example.test"; }
}
