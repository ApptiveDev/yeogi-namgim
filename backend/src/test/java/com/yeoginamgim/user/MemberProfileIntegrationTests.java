package com.yeoginamgim.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import com.yeoginamgim.auth.dto.AuthResponses.TokenPair;
import com.yeoginamgim.auth.service.MemberSessionService;
import com.yeoginamgim.auth.service.VerificationMailSender;
import com.yeoginamgim.friend.repository.FriendshipRepository;
import com.yeoginamgim.guest.service.GuestSessionService;
import com.yeoginamgim.user.domain.Member;
import com.yeoginamgim.user.repository.MemberRepository;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(properties = {
	"auth.enabled=true",
	"auth.jwt-secret=dGVzdC1qd3Qta2V5LXJlcGVhdC0zMi1ieXRlcy1vbmx5ISE=",
	"auth.verification-secret=dGVzdC1lbWFpbC1rZXktcmVwZWF0LTMyLWJ5dGVzLW9ubHk=",
	"auth.mail-from=noreply@example.test", "spring.mail.host=localhost"
})
@Transactional
class MemberProfileIntegrationTests {
	@Autowired WebApplicationContext context;
	@Autowired MemberRepository members;
	@Autowired MemberSessionService sessions;
	@Autowired GuestSessionService guests;
	@Autowired FriendshipRepository friendships;
	@MockitoBean VerificationMailSender mail;
	MockMvc mvc;
	Member first;
	Member second;
	TokenPair tokens;
	final JsonMapper json = JsonMapper.builder().build();

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.webAppContextSetup(context).build();
		first = member();
		second = member();
		tokens = sessions.open(first.getId());
	}

	@Test
	void normalizesPersistsAndReturnsUpdatedProfileWithoutChangingAccountFields() throws Exception {
		patchName("  새이름  ").andExpect(status().isOk())
			.andExpect(header().string("Cache-Control", "no-store"))
			.andExpect(jsonPath("$.data.nickname").value("새이름"))
			.andExpect(jsonPath("$.data.email").value(first.getEmail()))
			.andExpect(jsonPath("$.data.passwordHash").doesNotExist());
		Member persisted = members.findById(first.getId()).orElseThrow();
		assertThat(persisted.getNickname()).isEqualTo("새이름");
		assertThat(persisted.getPasswordHash()).isEqualTo(first.getPasswordHash());
		assertThat(persisted.getCreatedAt()).isEqualTo(first.getCreatedAt());
		mvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + tokens.accessToken()))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.nickname").value("새이름"));
	}

	@Test
	void ignoresInjectedAccountAndTargetFieldsAndUpdatesFriendsView() throws Exception {
		friendships.create(first.getId(), second.getId(), Instant.now());
		mvc.perform(patch("/api/v1/users/me").header("Authorization", "Bearer " + tokens.accessToken())
			.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of(
				"nickname", "바뀐이름", "userId", second.getId(), "email", "attacker@example.test", "passwordHash", "changed"))))
			.andExpect(status().isOk());
		assertThat(members.findById(first.getId()).orElseThrow().getEmail()).isEqualTo(first.getEmail());
		assertThat(members.findById(first.getId()).orElseThrow().getPasswordHash()).isEqualTo(first.getPasswordHash());
		assertThat(members.findById(second.getId()).orElseThrow().getNickname()).isEqualTo(second.getNickname());
		mvc.perform(get("/api/v1/friends").header("Authorization", "Bearer " + sessions.open(second.getId()).accessToken()))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.friends[0].nickname").value("바뀐이름"));
	}

	@Test
	void acceptsCodePointBoundariesAndSameName() throws Exception {
		for (String name : List.of("가나", "😀".repeat(20), first.getNickname(), first.getNickname())) {
			patchName(name).andExpect(status().isOk()).andExpect(jsonPath("$.data.nickname").value(name));
		}
	}

	@Test
	void rejectsBlankShortLongControlMissingAndMalformedInputWithoutMutation() throws Exception {
		for (String name : List.of("", "   ", "가", "가".repeat(21), "😀".repeat(21), "가\n나", "가\u0000나")) {
			patchName(name).andExpect(status().isBadRequest()).andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"));
		}
		for (String body : List.of("{}", "{\"nickname\":null}", "{", "")) {
			mvc.perform(patch("/api/v1/users/me").header("Authorization", "Bearer " + tokens.accessToken())
				.contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isBadRequest());
		}
		assertThat(members.findById(first.getId()).orElseThrow().getNickname()).isEqualTo(first.getNickname());
	}

	@Test
	void rejectsMissingGuestRefreshInvalidLoggedOutAndDeletedMemberTokens() throws Exception {
		mvc.perform(patch("/api/v1/users/me").contentType(MediaType.APPLICATION_JSON).content("{\"nickname\":\"새이름\"}"))
			.andExpect(status().isUnauthorized());
		String deletedToken = sessions.open(second.getId()).accessToken();
		members.deleteById(second.getId());
		members.flush();
		sessions.logout(tokens.refreshToken());
		for (String token : List.of("invalid", guests.create().guestToken(), tokens.refreshToken(), tokens.accessToken(), deletedToken)) {
			mvc.perform(patch("/api/v1/users/me").header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON).content("{\"nickname\":\"새이름\"}"))
				.andExpect(status().isUnauthorized());
		}
		assertThat(members.findById(first.getId()).orElseThrow().getNickname()).isEqualTo(first.getNickname());
	}

	private ResultActions patchName(String nickname) throws Exception {
		return mvc.perform(patch("/api/v1/users/me").header("Authorization", "Bearer " + tokens.accessToken())
			.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("nickname", nickname))));
	}
	private Member member() {
		return members.saveAndFlush(new Member(UUID.randomUUID(), UUID.randomUUID() + "@example.test", "unchanged-hash", "원래이름",
			Instant.parse("2026-11-01T00:00:00Z")));
	}
}
