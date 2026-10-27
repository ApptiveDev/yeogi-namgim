package com.yeoginamgim.note;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.ConnectionCallback;
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
import com.yeoginamgim.guest.dto.GuestSessionCreateResponse;
import com.yeoginamgim.guest.service.GuestSessionService;
import com.yeoginamgim.note.domain.Note;
import com.yeoginamgim.note.domain.NoteVisibility;
import com.yeoginamgim.note.repository.NoteRepository;
import com.yeoginamgim.notification.repository.NearbyNotificationRepository;
import com.yeoginamgim.push.repository.PushDeliveryRepository;
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
@Transactional
class MemberNoteIntegrationTests {
	@Autowired private WebApplicationContext context;
	@Autowired private JdbcTemplate jdbc;
	@Autowired private MemberRepository members;
	@Autowired private MemberSessionService sessions;
	@Autowired private GuestSessionService guests;
	@Autowired private NoteRepository notes;
	@Autowired private NearbyNotificationRepository nearby;
	@Autowired private PushDeliveryRepository push;
	@MockitoBean private VerificationMailSender mail;
	private final JsonMapper json = JsonMapper.builder().build();
	private MockMvc mvc;
	private Member member;
	private TokenPair tokens;
	private GuestSessionCreateResponse guest;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.webAppContextSetup(context).build();
		member = newMember();
		tokens = sessions.open(member.getId());
		guest = guests.create();
		notes.flush();
	}

	@Test
	void createsEveryVisibilityWithAuthenticatedAuthorAndServerTime() throws Exception {
		for (String visibility : List.of("PUBLIC", "FRIENDS", "PRIVATE")) {
			var input = request(visibility);
			input.put("authorUserId", UUID.randomUUID().toString());
			input.put("guestAuthorId", guest.guestId().toString());
			input.put("createdAt", "2000-01-01T00:00:00Z");
			Instant before = Instant.now();
			UUID id = id(create(tokens.accessToken(), input).andExpect(status().isCreated())
				.andExpect(header().string("Cache-Control", "no-store")));
			Note saved = notes.findById(id).orElseThrow();
			assertThat(saved.getAuthorUserId()).isEqualTo(member.getId());
			assertThat(saved.getGuestAuthorId()).isNull();
			assertThat(saved.getVisibility()).isEqualTo(NoteVisibility.valueOf(visibility));
			assertThat(saved.getContent()).isEqualTo("현재 위치의 기록");
			assertThat(saved.getColor()).isEqualTo("#FFCC3D");
			assertThat(saved.getPlaceName()).isEqualTo("부산대학교 정문");
			assertThat(saved.getNeighborhood()).isEqualTo("장전동");
			assertThat(saved.getCreatedAt()).isAfterOrEqualTo(before);
		}
	}

	@Test
	void optionalPlaceLookupFailureDoesNotPreventSavingCoordinates() throws Exception {
		var input = request("PRIVATE");
		input.remove("color");
		input.remove("placeName");
		input.put("neighborhood", "  ");
		Note saved = notes.findById(id(create(tokens.accessToken(), input).andExpect(status().isCreated()))).orElseThrow();
		assertThat(saved.getColor()).isNull();
		assertThat(saved.getPlaceName()).isNull();
		assertThat(saved.getNeighborhood()).isNull();
		assertThat(saved.getLatitude()).isEqualTo(35.1796);
	}

	@Test
	void rejectsMissingVisibilityAndInvalidFieldsWithoutInserting() throws Exception {
		long before = notes.count();
		for (var invalid : List.of(Map.of("visibility", "SECRET"), Map.of("visibility", ""),
			Map.of("content", " "), Map.of("content", "가".repeat(501)), Map.of("latitude", 91),
			Map.of("longitude", -181), Map.of("color", "red<script>"),
			Map.of("placeName", "가".repeat(201)), Map.of("neighborhood", "가".repeat(101)))) {
			var input = request("PUBLIC");
			input.putAll(invalid);
			create(tokens.accessToken(), input).andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"));
		}
		for (String missing : List.of("visibility", "latitude", "longitude")) {
			var input = request("PUBLIC");
			input.remove(missing);
			create(tokens.accessToken(), input).andExpect(status().isBadRequest());
		}
		assertThat(notes.count()).isEqualTo(before);
	}

	@Test
	void memberListIsIsolatedAndIncludesAllOwnVisibilities() throws Exception {
		for (String visibility : List.of("PUBLIC", "FRIENDS", "PRIVATE")) {
			create(tokens.accessToken(), request(visibility)).andExpect(status().isCreated());
		}
		var other = sessions.open(newMember().getId());
		create(other.accessToken(), request("PRIVATE")).andExpect(status().isCreated());
		create(guest.guestToken(), guestRequest()).andExpect(status().isCreated());
		mvc.perform(get("/api/v1/users/me/notes").header("Authorization", "Bearer " + tokens.accessToken()))
			.andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
			.andExpect(jsonPath("$.data.notes.length()").value(3))
			.andExpect(jsonPath("$.data.notes[0].visibility").value("PRIVATE"))
			.andExpect(jsonPath("$.data.notes[0].isMine").value(true))
			.andExpect(jsonPath("$.data.notes[0].authorUserId").doesNotExist())
			.andExpect(jsonPath("$.data.page").value(0)).andExpect(jsonPath("$.data.size").value(20))
			.andExpect(jsonPath("$.data.hasNext").value(false));
	}

	@Test
	void pagesHaveStableUuidTieBreakerAndNoOverlap() throws Exception {
		Instant time = Instant.parse("2026-10-26T00:00:00Z");
		for (int i = 1; i <= 3; i++) {
			notes.saveAndFlush(Note.createMember(new UUID(0, i), member.getId(), "쪽지", 35, 129,
				time, NoteVisibility.PRIVATE, null, null, null));
		}
		JsonNode first = data(mine("0", "2").andExpect(status().isOk())
			.andExpect(jsonPath("$.data.hasNext").value(true)));
		JsonNode last = data(mine("1", "2").andExpect(status().isOk())
			.andExpect(jsonPath("$.data.hasNext").value(false)));
		assertThat(first.get("notes").get(0).get("noteId").asText()).isEqualTo(new UUID(0, 3).toString());
		assertThat(first.get("notes").get(1).get("noteId").asText()).isEqualTo(new UUID(0, 2).toString());
		assertThat(last.get("notes").get(0).get("noteId").asText()).isEqualTo(new UUID(0, 1).toString());
		mine("2", "2").andExpect(status().isOk()).andExpect(jsonPath("$.data.notes.length()").value(0));
	}

	@Test
	void rejectsInvalidPages() throws Exception {
		for (var values : List.of(List.of("-1", "20"), List.of("0", "0"), List.of("0", "101"),
			List.of("10001", "20"), List.of("wrong", "20"))) {
			mine(values.get(0), values.get(1)).andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.error.code").value("INVALID_REQUEST"));
		}
	}

	@Test
	void opensOwnPrivateNoteWithoutLocationOrAtAnyDistance() throws Exception {
		UUID noteId = id(create(tokens.accessToken(), request("PRIVATE")).andExpect(status().isCreated()));
		for (String body : List.of("{}", "{\"latitude\":-35,\"longitude\":-129}")) {
			open(tokens.accessToken(), noteId, body).andExpect(status().isOk())
				.andExpect(jsonPath("$.data.content").value("현재 위치의 기록"))
				.andExpect(jsonPath("$.data.visibility").value("PRIVATE"))
				.andExpect(jsonPath("$.data.placeName").value("부산대학교 정문"));
		}
		mvc.perform(post("/api/v1/notes/{id}/open", noteId).header("Authorization", "Bearer " + tokens.accessToken()))
			.andExpect(status().isOk());
		open(tokens.accessToken(), noteId, "{\"latitude\":35}").andExpect(status().isBadRequest());
	}

	@Test
	void hidesAllMemberNotesFromGuestsAndOtherMembersUntilAccessPolicyIsImplemented() throws Exception {
		var other = sessions.open(newMember().getId());
		for (String visibility : List.of("PUBLIC", "FRIENDS", "PRIVATE")) {
			UUID noteId = id(create(tokens.accessToken(), request(visibility)).andExpect(status().isCreated()));
			for (String token : List.of(guest.guestToken(), other.accessToken())) {
				open(token, noteId, "{\"latitude\":35.1796,\"longitude\":129.0756}")
					.andExpect(status().isNotFound())
					.andExpect(jsonPath("$.error.code").value("RESOURCE_NOT_FOUND"))
					.andExpect(jsonPath("$.data").doesNotExist());
			}
		}
		mvc.perform(get("/api/v1/notes").header("Authorization", "Bearer " + guest.guestToken())
			.param("minLatitude", "35.17").param("minLongitude", "129.06")
			.param("maxLatitude", "35.19").param("maxLongitude", "129.09"))
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.notes.length()").value(0));
	}

	@Test
	void preservesGuestCreationAndNearbyOpeningAndRequiresLocation() throws Exception {
		UUID noteId = id(create(guest.guestToken(), guestRequest()).andExpect(status().isCreated()));
		Note saved = notes.findById(noteId).orElseThrow();
		assertThat(saved.getGuestAuthorId()).isEqualTo(guest.guestId());
		assertThat(saved.getAuthorUserId()).isNull();
		assertThat(saved.getVisibility()).isEqualTo(NoteVisibility.PUBLIC);
		open(guest.guestToken(), noteId, "{\"latitude\":35.1796,\"longitude\":129.0756}")
			.andExpect(status().isOk()).andExpect(jsonPath("$.data.isMine").value(true));
		open(guest.guestToken(), noteId, "{\"latitude\":36,\"longitude\":129}")
			.andExpect(status().isForbidden()).andExpect(jsonPath("$.error.code").value("NOTE_LOCKED"));
		open(guest.guestToken(), noteId, "{}").andExpect(status().isBadRequest());
		create(guest.guestToken(), request("PRIVATE")).andExpect(status().isBadRequest());
	}

	@Test
	void rejectsMissingWrongAndRevokedTokensAndGuestAccessToMemberList() throws Exception {
		for (String token : List.of("invalid", tokens.refreshToken(), tokens.accessToken() + "corrupt")) {
			create(token, request("PUBLIC")).andExpect(status().isUnauthorized());
		}
		mvc.perform(post("/api/v1/notes").contentType(MediaType.APPLICATION_JSON)
			.content(json.writeValueAsString(request("PUBLIC")))).andExpect(status().isUnauthorized());
		mvc.perform(get("/api/v1/users/me/notes").header("Authorization", "Bearer " + guest.guestToken()))
			.andExpect(status().isUnauthorized());
		mvc.perform(get("/api/v1/users/me/notes")).andExpect(status().isUnauthorized());
		sessions.logout(tokens.refreshToken());
		create(tokens.accessToken(), request("PUBLIC")).andExpect(status().isUnauthorized());
		mine("0", "20").andExpect(status().isUnauthorized());
	}

	@Test
	void memberNotesCannotTriggerGuestNearbyOrScheduledPushButGuestNotesStillCan() {
		double latitude = -49.9;
		double longitude = -120.2;
		UUID tokenId = UUID.randomUUID();
		jdbc.update("INSERT INTO app.guest_locations (guest_id,latitude,longitude,updated_at) VALUES (?,?,?,?)",
			guest.guestId(), latitude, longitude, java.sql.Timestamp.from(Instant.now()));
		jdbc.update("INSERT INTO app.push_tokens (id,guest_id,platform,push_token,enabled,created_at) VALUES (?,?, 'ANDROID',?,true,now())",
			tokenId, guest.guestId(), "member-note-test-" + UUID.randomUUID());
		for (NoteVisibility visibility : NoteVisibility.values()) {
			notes.saveAndFlush(Note.createMember(UUID.randomUUID(), member.getId(), "회원", latitude, longitude,
				Instant.now(), visibility, null, null, null));
		}
		assertThat(nearby.existsWithinRadius(latitude, longitude)).isFalse();
		assertThat(push.findCandidates(Instant.now().minusSeconds(60), new UUID(0, 0)))
			.noneMatch(candidate -> candidate.tokenId().equals(tokenId));
		notes.saveAndFlush(Note.create(UUID.randomUUID(), guest.guestId(), "비회원", latitude, longitude, Instant.now()));
		assertThat(nearby.existsWithinRadius(latitude, longitude)).isTrue();
		assertThat(push.findCandidates(Instant.now().minusSeconds(60), new UUID(0, 0)))
			.anyMatch(candidate -> candidate.tokenId().equals(tokenId));
	}

	@Test
	void databaseRejectsMissingOrDoubleAuthorAndNonPublicGuest() {
		for (String invalidColumns : List.of("NULL,NULL,'PUBLIC'", "?,?,'PUBLIC'", "?,NULL,'PRIVATE'")) {
			jdbc.execute((ConnectionCallback<Void>) connection -> {
				var savepoint = connection.setSavepoint();
				try {
					String sql = "INSERT INTO app.notes (id,guest_author_id,author_user_id,visibility,content,latitude,longitude,created_at) VALUES ('"
						+ UUID.randomUUID() + "'," + invalidColumns + ",'x',35,129,now())";
					try (var statement = connection.prepareStatement(sql)) {
						if (invalidColumns.contains("?")) statement.setObject(1, guest.guestId());
						if (invalidColumns.startsWith("?,?")) statement.setObject(2, member.getId());
						assertThatThrownBy(statement::executeUpdate).isInstanceOf(java.sql.SQLException.class)
							.satisfies(error -> assertThat(((java.sql.SQLException)error).getSQLState()).isEqualTo("23514"));
					}
				} finally {
					connection.rollback(savepoint);
					connection.releaseSavepoint(savepoint);
				}
				return null;
			});
		}
	}

	private Member newMember() {
		return members.saveAndFlush(new Member(UUID.randomUUID(), UUID.randomUUID() + "@example.test",
			"unused-in-session-tests", "쪽지테스트", Instant.now()));
	}
	private Map<String, Object> guestRequest() {
		return Map.of("content", "비회원 기록", "latitude", 35.1796, "longitude", 129.0756);
	}
	private Map<String, Object> request(String visibility) {
		var input = new HashMap<String, Object>(guestRequest());
		input.putAll(Map.of("content", "  현재 위치의 기록  ", "visibility", visibility, "color", "#FFCC3D",
			"placeName", " 부산대학교 정문 ", "neighborhood", " 장전동 "));
		return input;
	}
	private ResultActions create(String token, Map<String, ?> input) throws Exception {
		return mvc.perform(post("/api/v1/notes").header("Authorization", "Bearer " + token)
			.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(input)));
	}
	private ResultActions open(String token, UUID id, String body) throws Exception {
		return mvc.perform(post("/api/v1/notes/{id}/open", id).header("Authorization", "Bearer " + token)
			.contentType(MediaType.APPLICATION_JSON).content(body));
	}
	private ResultActions mine(String page, String size) throws Exception {
		return mvc.perform(get("/api/v1/users/me/notes").header("Authorization", "Bearer " + tokens.accessToken())
			.param("page", page).param("size", size));
	}
	private UUID id(ResultActions result) throws Exception { return UUID.fromString(data(result).get("noteId").asText()); }
	private JsonNode data(ResultActions result) throws Exception {
		return json.readTree(result.andReturn().getResponse().getContentAsString()).get("data");
	}
}
