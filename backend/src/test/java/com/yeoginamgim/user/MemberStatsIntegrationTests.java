package com.yeoginamgim.user;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.nullValue;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import com.yeoginamgim.auth.dto.AuthResponses.TokenPair;
import com.yeoginamgim.auth.service.MemberSessionService;
import com.yeoginamgim.auth.service.VerificationMailSender;
import com.yeoginamgim.friend.repository.FriendshipRepository;
import com.yeoginamgim.LegacyGuestFixtures;
import com.yeoginamgim.note.domain.Note;
import com.yeoginamgim.note.domain.NoteVisibility;
import com.yeoginamgim.note.repository.NoteRepository;
import com.yeoginamgim.user.domain.Member;
import com.yeoginamgim.user.repository.MemberRepository;

@SpringBootTest(properties = {
	"auth.enabled=true",
	"auth.jwt-secret=dGVzdC1qd3Qta2V5LXJlcGVhdC0zMi1ieXRlcy1vbmx5ISE=",
	"auth.verification-secret=dGVzdC1lbWFpbC1rZXktcmVwZWF0LTMyLWJ5dGVzLW9ubHk=",
	"auth.mail-from=noreply@example.test", "spring.mail.host=localhost"
})
@Transactional
class MemberStatsIntegrationTests {
	@Autowired WebApplicationContext context;
	@Autowired MemberRepository members;
	@Autowired NoteRepository notes;
	@Autowired FriendshipRepository friendships;
	@Autowired MemberSessionService sessions;
	@Autowired LegacyGuestFixtures guests;
	@MockitoBean VerificationMailSender mail;
	MockMvc mvc;
	Member first;
	Member second;
	TokenPair tokens;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.webAppContextSetup(context).build();
		first = member();
		second = member();
		tokens = sessions.open(first.getId());
	}

	@Test
	void emptyCountsDistinguishMissingBookmarkSourceAndKeepProfileCompatible() throws Exception {
		mvc.perform(get("/api/v1/users/me/stats").header("Authorization", "Bearer " + tokens.accessToken()))
			.andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
			.andExpect(jsonPath("$.data.writtenNoteCount").value(0))
			.andExpect(jsonPath("$.data.friendCount").value(0))
			.andExpect(jsonPath("$.data.savedNoteCount").value(nullValue()));
		mvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + tokens.accessToken()))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.userId").value(first.getId().toString()));
	}

	@Test
	void countsAllOwnVisibilitiesAndOnlyOwnFriendsIgnoringOtherAndGuestNotes() throws Exception {
		for (NoteVisibility visibility : NoteVisibility.values()) addNote(first.getId(), visibility);
		addNote(second.getId(), NoteVisibility.PUBLIC);
		var guest = guests.create();
		notes.saveAndFlush(Note.create(UUID.randomUUID(), guest.guestId(), "guest", 37, 127, Instant.now()));
		friendships.create(first.getId(), second.getId(), Instant.now());
		friendships.create(second.getId(), member().getId(), Instant.now());
		mvc.perform(get("/api/v1/users/me/stats").header("Authorization", "Bearer " + tokens.accessToken())
			.param("userId", second.getId().toString()))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.writtenNoteCount").value(3))
			.andExpect(jsonPath("$.data.friendCount").value(1));
		mvc.perform(get("/api/v1/users/me/stats").header("Authorization", "Bearer " + sessions.open(second.getId()).accessToken()))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.writtenNoteCount").value(1))
			.andExpect(jsonPath("$.data.friendCount").value(2));
	}

	@Test
	void rejectsMissingRefreshInvalidAndLoggedOutTokens() throws Exception {
		mvc.perform(get("/api/v1/users/me/stats")).andExpect(status().isUnauthorized());
		sessions.logout(tokens.refreshToken());
		for (String token : List.of("invalid", tokens.refreshToken(), tokens.accessToken())) {
			mvc.perform(get("/api/v1/users/me/stats").header("Authorization", "Bearer " + token))
				.andExpect(status().isUnauthorized()).andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
		}
	}

	private Member member() {
		return members.saveAndFlush(new Member(UUID.randomUUID(), UUID.randomUUID() + "@example.test", "unused", "회원", Instant.now()));
	}
	private void addNote(UUID userId, NoteVisibility visibility) {
		notes.saveAndFlush(Note.createMember(UUID.randomUUID(), userId, "note", 37, 127, Instant.now(), visibility, null, null, null));
	}
}
