package com.yeoginamgim.friend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.yeoginamgim.auth.dto.AuthResponses.TokenPair;
import com.yeoginamgim.auth.service.MemberSessionService;
import com.yeoginamgim.auth.service.VerificationMailSender;
import com.yeoginamgim.friend.dto.FriendResponses.InvitationCreated;
import com.yeoginamgim.friend.repository.FriendInvitationRepository;
import com.yeoginamgim.friend.repository.FriendshipRepository;
import com.yeoginamgim.friend.service.FriendException;
import com.yeoginamgim.friend.service.FriendInvitationCodeCodec;
import com.yeoginamgim.friend.service.FriendService;
import com.yeoginamgim.friend.service.FriendshipQueryService;
import com.yeoginamgim.guest.service.GuestSessionService;
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
class FriendIntegrationTests {
	@Autowired private WebApplicationContext context;
	@Autowired private JdbcTemplate jdbc;
	@Autowired private MemberRepository members;
	@Autowired private MemberSessionService sessions;
	@Autowired private GuestSessionService guests;
	@Autowired private FriendService friends;
	@Autowired private FriendshipRepository relationships;
	@Autowired private FriendInvitationRepository invitations;
	@Autowired private FriendshipQueryService query;
	@Autowired private FriendInvitationCodeCodec codes;
	@MockitoBean private VerificationMailSender mail;
	private final JsonMapper json = JsonMapper.builder().build();
	private final List<UUID> createdUsers = new ArrayList<>();
	private MockMvc mvc;
	private Member first;
	private Member second;
	private Member third;
	private TokenPair firstTokens;
	private TokenPair secondTokens;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.webAppContextSetup(context).build();
		first = newMember(UUID.randomUUID(), "초대한사람");
		second = newMember(UUID.randomUUID(), "수락한사람");
		third = newMember(UUID.randomUUID(), "다른사람");
		firstTokens = sessions.open(first.getId());
		secondTokens = sessions.open(second.getId());
	}

	@AfterEach
	void cleanUp() {
		for (UUID id : createdUsers) jdbc.update("DELETE FROM app.users WHERE id = ?", id);
	}

	@Test
	void generatesExpiringNonPermanentCodesAndStoresOnlyHash() throws Exception {
		Instant before = Instant.now();
		JsonNode result = data(create(firstTokens.accessToken()).andExpect(status().isCreated())
			.andExpect(header().string("Cache-Control", "no-store")));
		String code = result.get("code").asText();
		assertThat(code).matches("[A-HJ-NP-Z2-9]{16}");
		Instant expiry = Instant.parse(result.get("expiresAt").asText());
		assertThat(Duration.between(before, expiry).toSeconds()).isBetween(86400L, 86405L);
		assertThat(jdbc.queryForObject("SELECT code_hash FROM app.friend_invitations WHERE inviter_id = ?",
			String.class, first.getId())).isEqualTo(codes.hash(code)).isNotEqualTo(code);
		String another = data(create(firstTokens.accessToken()).andExpect(status().isCreated())).get("code").asText();
		assertThat(another).isNotEqualTo(code);
		assertThat(new InvitationCreated(code, expiry).toString()).doesNotContain(code);
	}

	@Test
	void previewIsReadOnlyAndAcceptanceCreatesMutualFriendship() throws Exception {
		String code = invitation(first);
		for (int i = 0; i < 2; i++) {
			preview(secondTokens.accessToken(), code.toLowerCase(Locale.ROOT))
				.andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
				.andExpect(jsonPath("$.data.inviterNickname").value(first.getNickname()))
				.andExpect(jsonPath("$.data.email").doesNotExist())
				.andExpect(jsonPath("$.data.inviterId").doesNotExist());
		}
		assertThat(invitations.find(codes.hash(code), false).orElseThrow().acceptedBy()).isNull();
		assertThat(query.countFriends(first.getId())).isZero();
		accept(secondTokens.accessToken(), code).andExpect(status().isOk())
			.andExpect(jsonPath("$.data.friendId").value(first.getId().toString()));
		list(firstTokens.accessToken(), "0", "20").andExpect(status().isOk())
			.andExpect(jsonPath("$.data.friends[0].friendId").value(second.getId().toString()))
			.andExpect(jsonPath("$.data.friends[0].nickname").value(second.getNickname()))
			.andExpect(jsonPath("$.data.hasNext").value(false));
		list(secondTokens.accessToken(), "0", "20").andExpect(status().isOk())
			.andExpect(jsonPath("$.data.friends[0].friendId").value(first.getId().toString()));
		assertThat(query.countFriends(first.getId())).isEqualTo(1);
		assertThat(query.countFriends(second.getId())).isEqualTo(1);
		assertThat(invitations.find(codes.hash(code), false).orElseThrow().acceptedBy()).isEqualTo(second.getId());
	}

	@Test
	void rejectsUsedExpiredUnknownAndMalformedCodes() throws Exception {
		String used = invitation(first);
		accept(secondTokens.accessToken(), used).andExpect(status().isOk());
		String expired = invitation(first);
		jdbc.update("UPDATE app.friend_invitations SET created_at = now() - interval '2 days', expires_at = now() - interval '1 day' WHERE code_hash = ?",
			codes.hash(expired));
		for (String code : List.of(used, expired, "AAAAAAAAAAAAAAAA", "wrong-code")) {
			preview(secondTokens.accessToken(), code).andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code").value("FRIEND_INVITATION_INVALID"));
			accept(secondTokens.accessToken(), code).andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code").value("FRIEND_INVITATION_INVALID"));
		}
	}

	@Test
	void selfInvitationDoesNotConsumeCode() throws Exception {
		String code = invitation(first);
		preview(firstTokens.accessToken(), code).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.error.code").value("FRIEND_SELF_INVITATION"));
		accept(firstTokens.accessToken(), code).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.error.code").value("FRIEND_SELF_INVITATION"));
		assertThat(invitations.find(codes.hash(code), false).orElseThrow().acceptedBy()).isNull();
		accept(secondTokens.accessToken(), code).andExpect(status().isOk());
	}

	@Test
	void duplicateFriendshipDoesNotConsumeAnotherInvitation() throws Exception {
		friends.accept(second.getId(), invitation(first));
		String another = invitation(first);
		preview(secondTokens.accessToken(), another).andExpect(status().isConflict())
			.andExpect(jsonPath("$.error.code").value("FRIEND_ALREADY_EXISTS"));
		accept(secondTokens.accessToken(), another).andExpect(status().isConflict());
		assertThat(invitations.find(codes.hash(another), false).orElseThrow().acceptedBy()).isNull();
		friends.accept(third.getId(), another);
		assertThat(query.countFriends(first.getId())).isEqualTo(2);
	}

	@Test
	void friendQueriesReturnOnlyCandidateFriendsAndRemainSymmetric() {
		friends.accept(second.getId(), invitation(first));
		assertThat(query.findFriendIds(first.getId(), Set.of(first.getId(), second.getId(), third.getId())))
			.containsExactly(second.getId());
		assertThat(query.findFriendIds(second.getId(), Set.of(first.getId(), third.getId())))
			.containsExactly(first.getId());
		assertThat(query.findFriendIds(third.getId(), Set.of(first.getId(), second.getId()))).isEmpty();
		assertThat(query.findFriendIds(first.getId(), Set.of())).isEmpty();
	}

	@Test
	void canonicalPairHandlesPostgresUuidOrderAcrossJavaSignBoundary() {
		Member low = newMember(new UUID(0, 1), "낮은UUID");
		Member high = newMember(new UUID(-1, -1), "높은UUID");
		friends.accept(low.getId(), invitation(high));
		assertThat(jdbc.queryForObject("SELECT user_low FROM app.friendships WHERE user_high = ?", UUID.class, high.getId()))
			.isEqualTo(low.getId());
		assertThat(query.findFriendIds(high.getId(), Set.of(low.getId()))).containsExactly(low.getId());
	}

	@Test
	void listsAreIsolatedPagedAndStableOnTimestampTies() throws Exception {
		Instant sameTime = Instant.parse("2026-10-27T00:00:00Z");
		relationships.create(first.getId(), second.getId(), sameTime);
		relationships.create(first.getId(), third.getId(), sameTime);
		List<String> expected = List.of(second.getId().toString(), third.getId().toString()).stream()
			.sorted(java.util.Comparator.reverseOrder()).toList();
		list(firstTokens.accessToken(), "0", "1").andExpect(status().isOk())
			.andExpect(jsonPath("$.data.friends[0].friendId").value(expected.get(0)))
			.andExpect(jsonPath("$.data.hasNext").value(true));
		list(firstTokens.accessToken(), "1", "1").andExpect(status().isOk())
			.andExpect(jsonPath("$.data.friends[0].friendId").value(expected.get(1)))
			.andExpect(jsonPath("$.data.hasNext").value(false));
		list(firstTokens.accessToken(), "2", "1").andExpect(status().isOk())
			.andExpect(jsonPath("$.data.friends.length()").value(0));
		list(secondTokens.accessToken(), "0", "20").andExpect(status().isOk())
			.andExpect(jsonPath("$.data.friends.length()").value(1));
	}

	@Test
	void emptyFriendListAndPageValidation() throws Exception {
		mvc.perform(get("/api/v1/friends").header("Authorization", "Bearer " + firstTokens.accessToken()))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.friends.length()").value(0))
			.andExpect(jsonPath("$.data.page").value(0)).andExpect(jsonPath("$.data.size").value(20))
			.andExpect(jsonPath("$.data.hasNext").value(false));
		for (var values : List.of(List.of("-1", "20"), List.of("10001", "20"), List.of("0", "101"),
			List.of("0", "0"), List.of("wrong", "20"))) {
			list(firstTokens.accessToken(), values.get(0), values.get(1)).andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"));
		}
	}

	@Test
	void allFriendRoutesRequireValidActiveMemberToken() throws Exception {
		String code = invitation(first);
		String guestToken = guests.create().guestToken();
		sessions.logout(secondTokens.refreshToken());
		for (String token : List.of("wrong", guestToken, firstTokens.refreshToken(), secondTokens.accessToken())) {
			create(token).andExpect(status().isUnauthorized());
			preview(token, code).andExpect(status().isUnauthorized());
			accept(token, code).andExpect(status().isUnauthorized());
			list(token, "0", "20").andExpect(status().isUnauthorized());
		}
		mvc.perform(post("/api/v1/friends/invitations")).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/v1/friends")).andExpect(status().isUnauthorized());
	}

	@Test
	void invitationGenerationAndLookupAreRateLimited() throws Exception {
		for (int i = 0; i < 10; i++) create(firstTokens.accessToken()).andExpect(status().isCreated());
		create(firstTokens.accessToken()).andExpect(status().isTooManyRequests());
		for (int i = 0; i < 30; i++) preview(secondTokens.accessToken(), "AAAAAAAAAAAAAAAA").andExpect(status().isBadRequest());
		preview(secondTokens.accessToken(), "AAAAAAAAAAAAAAAA").andExpect(status().isTooManyRequests());
		for (int i = 0; i < 30; i++) accept(secondTokens.accessToken(), "AAAAAAAAAAAAAAAA").andExpect(status().isBadRequest());
		accept(secondTokens.accessToken(), "AAAAAAAAAAAAAAAA").andExpect(status().isTooManyRequests());
	}

	@Test
	void sameCodeCanBeAcceptedByOnlyOneConcurrentUser() throws Exception {
		String code = invitation(first);
		var outcomes = concurrently(() -> acceptOutcome(second.getId(), code), () -> acceptOutcome(third.getId(), code));
		assertThat(outcomes).containsExactlyInAnyOrder("OK", "FRIEND_INVITATION_INVALID");
		assertThat(query.countFriends(first.getId())).isEqualTo(1);
		UUID winner = invitations.find(codes.hash(code), false).orElseThrow().acceptedBy();
		assertThat(query.findFriendIds(first.getId(), Set.of(second.getId(), third.getId()))).containsExactly(winner);
	}

	@Test
	void concurrentDifferentCodesCannotDuplicateSameFriendPair() throws Exception {
		String firstCode = invitation(first);
		String secondCode = invitation(first);
		var outcomes = concurrently(() -> acceptOutcome(second.getId(), firstCode), () -> acceptOutcome(second.getId(), secondCode));
		assertThat(outcomes).containsExactlyInAnyOrder("OK", "FRIEND_ALREADY_EXISTS");
		assertThat(query.countFriends(first.getId())).isEqualTo(1);
		long used = List.of(firstCode, secondCode).stream()
			.filter(code -> invitations.find(codes.hash(code), false).orElseThrow().acceptedBy() != null).count();
		assertThat(used).isEqualTo(1);
	}

	@Test
	void concurrentReciprocalInvitationsAlsoCreateOnePair() throws Exception {
		String firstCode = invitation(first);
		String secondCode = invitation(second);
		var outcomes = concurrently(() -> acceptOutcome(second.getId(), firstCode), () -> acceptOutcome(first.getId(), secondCode));
		assertThat(outcomes).containsExactlyInAnyOrder("OK", "FRIEND_ALREADY_EXISTS");
		assertThat(query.countFriends(first.getId())).isEqualTo(1);
		assertThat(query.countFriends(second.getId())).isEqualTo(1);
	}

	@Test
	void memberDeletionRemovesFriendRelationsAndInvitationReferences() {
		String code = invitation(first);
		friends.accept(second.getId(), code);
		jdbc.update("DELETE FROM app.users WHERE id = ?", second.getId());
		assertThat(query.countFriends(first.getId())).isZero();
		assertThat(invitations.find(codes.hash(code), false)).isEmpty();
	}

	private List<String> concurrently(Callable<String> firstTask, Callable<String> secondTask) throws Exception {
		CyclicBarrier barrier = new CyclicBarrier(2);
		try (var executor = Executors.newFixedThreadPool(2)) {
			var results = executor.invokeAll(List.of(
				(Callable<String>) () -> { barrier.await(); return firstTask.call(); },
				(Callable<String>) () -> { barrier.await(); return secondTask.call(); }));
			return List.of(results.get(0).get(), results.get(1).get());
		}
	}
	private String acceptOutcome(UUID userId, String code) {
		try { friends.accept(userId, code); return "OK"; }
		catch (FriendException exception) { return exception.getCode(); }
	}
	private Member newMember(UUID id, String nickname) {
		createdUsers.add(id);
		return members.saveAndFlush(new Member(id, UUID.randomUUID() + "@example.test", "unused", nickname, Instant.now()));
	}
	private String invitation(Member inviter) { return friends.createInvitation(inviter.getId()).code(); }
	private ResultActions create(String token) throws Exception {
		return mvc.perform(post("/api/v1/friends/invitations").header("Authorization", "Bearer " + token));
	}
	private ResultActions preview(String token, String code) throws Exception {
		return mvc.perform(get("/api/v1/friends/invitations/{code}", code).header("Authorization", "Bearer " + token));
	}
	private ResultActions accept(String token, String code) throws Exception {
		return mvc.perform(post("/api/v1/friends/invitations/{code}/accept", code).header("Authorization", "Bearer " + token));
	}
	private ResultActions list(String token, String page, String size) throws Exception {
		return mvc.perform(get("/api/v1/friends").header("Authorization", "Bearer " + token).param("page", page).param("size", size));
	}
	private JsonNode data(ResultActions result) throws Exception {
		return json.readTree(result.andReturn().getResponse().getContentAsString()).get("data");
	}
}
