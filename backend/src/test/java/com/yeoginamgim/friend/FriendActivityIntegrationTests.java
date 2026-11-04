package com.yeoginamgim.friend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
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
class FriendActivityIntegrationTests {
	@Autowired WebApplicationContext context;
	@Autowired MemberRepository members;
	@Autowired NoteRepository notes;
	@Autowired FriendshipRepository friendships;
	@Autowired MemberSessionService sessions;
	@Autowired LegacyGuestFixtures guests;
	@Autowired JdbcTemplate jdbc;
	@MockitoBean VerificationMailSender mail;
	MockMvc mvc;
	Member viewer;
	Member friend;
	Member stranger;
	TokenPair tokens;
	final Instant time = Instant.parse("2026-11-01T00:00:00Z");

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.webAppContextSetup(context).build();
		viewer = member(); friend = member(); stranger = member();
		tokens = sessions.open(viewer.getId());
		friendships.create(viewer.getId(), friend.getId(), time);
	}

	@Test
	void includesOnlyCurrentFriendsFriendsNotesAndDoesNotExposeContentOrCoordinates() throws Exception {
		Note visible = note(friend, NoteVisibility.FRIENDS, time);
		note(friend, NoteVisibility.PUBLIC, time);
		note(friend, NoteVisibility.PRIVATE, time);
		note(stranger, NoteVisibility.FRIENDS, time);
		note(viewer, NoteVisibility.FRIENDS, time);
		var guest = guests.create();
		notes.saveAndFlush(Note.create(UUID.randomUUID(), guest.guestId(), "guest secret", 37, 127, time));
		list(tokens.accessToken(), "0", "20").andExpect(status().isOk())
			.andExpect(header().string("Cache-Control", "no-store"))
			.andExpect(jsonPath("$.data.activities.length()").value(1))
			.andExpect(jsonPath("$.data.activities[0].noteId").value(visible.getId().toString()))
			.andExpect(jsonPath("$.data.activities[0].friendId").value(friend.getId().toString()))
			.andExpect(jsonPath("$.data.activities[0].nickname").value(friend.getNickname()))
			.andExpect(jsonPath("$.data.activities[0].placeName").value("서울숲"))
			.andExpect(jsonPath("$.data.activities[0].content").doesNotExist())
			.andExpect(jsonPath("$.data.activities[0].preview").doesNotExist())
			.andExpect(jsonPath("$.data.activities[0].latitude").doesNotExist())
			.andExpect(jsonPath("$.data.activities[0].longitude").doesNotExist())
			.andExpect(jsonPath("$.data.activities[0].email").doesNotExist());
		list(sessions.open(stranger.getId()).accessToken(), "0", "20")
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.activities.length()").value(0));
	}

	@Test
	void reciprocalFriendshipWorksAndMissingPlaceIsPreserved() throws Exception {
		notes.saveAndFlush(Note.createMember(UUID.randomUUID(), viewer.getId(), "secret", 37, 127, time,
			NoteVisibility.FRIENDS, null, null, null));
		list(sessions.open(friend.getId()).accessToken(), "0", "20").andExpect(status().isOk())
			.andExpect(jsonPath("$.data.activities.length()").value(1))
			.andExpect(jsonPath("$.data.activities[0].placeName").value(nullValue()))
			.andExpect(jsonPath("$.data.activities[0].neighborhood").value(nullValue()));
	}

	@Test
	void paginationIsNewestFirstAndStableForTimestampTies() throws Exception {
		Note older = note(friend, NoteVisibility.FRIENDS, time.minusSeconds(1));
		Note a = note(friend, NoteVisibility.FRIENDS, time);
		Note b = note(friend, NoteVisibility.FRIENDS, time);
		List<String> sameTime = List.of(a.getId().toString(), b.getId().toString()).stream()
			.sorted(java.util.Comparator.reverseOrder()).toList();
		for (int page = 0; page < 3; page++) {
			String expected = page < 2 ? sameTime.get(page) : older.getId().toString();
			list(tokens.accessToken(), String.valueOf(page), "1").andExpect(status().isOk())
				.andExpect(jsonPath("$.data.activities[0].noteId").value(expected))
				.andExpect(jsonPath("$.data.hasNext").value(page < 2));
		}
		list(tokens.accessToken(), "3", "1").andExpect(status().isOk())
			.andExpect(jsonPath("$.data.activities.length()").value(0)).andExpect(jsonPath("$.data.hasNext").value(false));
	}

	@Test
	void removesActivitiesWhenVisibilityOrCurrentRelationshipChanges() throws Exception {
		Note item = note(friend, NoteVisibility.FRIENDS, time);
		list(tokens.accessToken(), "0", "20").andExpect(jsonPath("$.data.activities.length()").value(1));
		for (String visibility : List.of("PRIVATE", "PUBLIC")) {
			jdbc.update("UPDATE app.notes SET visibility = ? WHERE id = ?", visibility, item.getId());
			list(tokens.accessToken(), "0", "20").andExpect(jsonPath("$.data.activities.length()").value(0));
		}
		jdbc.update("UPDATE app.notes SET visibility = 'FRIENDS' WHERE id = ?", item.getId());
		jdbc.update("DELETE FROM app.friendships WHERE user_low = ? OR user_high = ?", viewer.getId(), viewer.getId());
		list(tokens.accessToken(), "0", "20").andExpect(jsonPath("$.data.activities.length()").value(0));
	}

	@Test
	void seeingActivityDoesNotUnlockRemoteNote() throws Exception {
		Note item = note(friend, NoteVisibility.FRIENDS, time);
		list(tokens.accessToken(), "0", "20").andExpect(status().isOk())
			.andExpect(jsonPath("$.data.activities.length()").value(1));
		mvc.perform(post("/api/v1/notes/{id}/open", item.getId())
			.header("Authorization", "Bearer " + tokens.accessToken())
			.contentType(MediaType.APPLICATION_JSON).content("{\"latitude\":0,\"longitude\":0,"
				+ "\"accuracyMeters\":10,\"measuredAt\":\"" + Instant.now() + "\"}"))
			.andExpect(status().isForbidden()).andExpect(jsonPath("$.error.code").value("NOTE_LOCKED"));
		assertThat(notes.findById(item.getId()).orElseThrow().getContent()).isEqualTo("secret body");
	}

	@Test
	void emptyDefaultsAndInvalidPages() throws Exception {
		mvc.perform(get("/api/v1/friends/activities").header("Authorization", "Bearer " + tokens.accessToken()))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.page").value(0))
			.andExpect(jsonPath("$.data.size").value(20)).andExpect(jsonPath("$.data.activities.length()").value(0));
		for (var pair : List.of(List.of("-1", "20"), List.of("10001", "20"), List.of("0", "0"),
			List.of("0", "101"), List.of("wrong", "20"))) {
			list(tokens.accessToken(), pair.get(0), pair.get(1)).andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"));
		}
	}

	@Test
	void requiresActiveMemberAccessToken() throws Exception {
		mvc.perform(get("/api/v1/friends/activities")).andExpect(status().isUnauthorized());
		sessions.logout(tokens.refreshToken());
		for (String token : List.of("invalid", guests.create().guestToken(), tokens.refreshToken(), tokens.accessToken())) {
			list(token, "0", "20").andExpect(status().isUnauthorized());
		}
	}

	private ResultActions list(String token, String page, String size) throws Exception {
		return mvc.perform(get("/api/v1/friends/activities").header("Authorization", "Bearer " + token)
			.param("page", page).param("size", size));
	}
	private Member member() {
		return members.saveAndFlush(new Member(UUID.randomUUID(), UUID.randomUUID() + "@example.test", "unused", "친구이름", time));
	}
	private Note note(Member author, NoteVisibility visibility, Instant createdAt) {
		return notes.saveAndFlush(Note.createMember(UUID.randomUUID(), author.getId(), "secret body", 37, 127, createdAt,
			visibility, null, "서울숲", "성수동"));
	}
}
