package com.yeoginamgim.note.map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
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

import com.yeoginamgim.auth.service.MemberSessionService;
import com.yeoginamgim.auth.service.VerificationMailSender;
import com.yeoginamgim.friend.repository.FriendshipRepository;
import com.yeoginamgim.guest.service.GuestSessionService;
import com.yeoginamgim.note.domain.Note;
import com.yeoginamgim.note.domain.NoteVisibility;
import com.yeoginamgim.note.repository.NoteRepository;
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
abstract class MemberMapTestSupport {
	@Autowired protected WebApplicationContext context;
	@Autowired protected JdbcTemplate jdbc;
	@Autowired protected NoteRepository notes;
	@Autowired protected MemberRepository members;
	@Autowired protected MemberSessionService sessions;
	@Autowired protected GuestSessionService guests;
	@Autowired protected FriendshipRepository friendships;
	@MockitoBean protected VerificationMailSender mail;
	protected final JsonMapper json = JsonMapper.builder().build();
	protected MockMvc mvc;
	protected Member me;
	protected Member friend;
	protected Member stranger;
	protected String token;

	@BeforeEach
	void prepareMap() {
		mvc = MockMvcBuilders.webAppContextSetup(context).build();
		me = member("나예요");
		friend = member("친구이름");
		stranger = member("타인이름");
		token = sessions.open(me.getId()).accessToken();
		friendships.create(me.getId(), friend.getId(), Instant.now());
	}

	protected Member member(String nickname) {
		return members.saveAndFlush(new Member(UUID.randomUUID(), UUID.randomUUID() + "@example.test",
			"unused", nickname, Instant.now()));
	}

	protected Note note(Member author, NoteVisibility visibility, double meters, String content) {
		return note(UUID.randomUUID(), author, visibility, meters, content, Instant.now());
	}

	protected Note note(UUID id, Member author, NoteVisibility visibility, double meters, String content, Instant time) {
		var coords = jdbc.queryForMap("""
			SELECT public.ST_Y(p::public.geometry) AS latitude, public.ST_X(p::public.geometry) AS longitude
			FROM (SELECT public.ST_Project(public.ST_SetSRID(public.ST_MakePoint(129,35),4326)::public.geography, ?, 0) AS p) q
			""", meters);
		return notes.saveAndFlush(Note.createMember(id, author.getId(), content,
			((Number)coords.get("latitude")).doubleValue(), ((Number)coords.get("longitude")).doubleValue(),
			time, visibility, "#FFCC3D", "장소이름", "동네이름"));
	}

	protected ResultActions map(String filter, boolean location) throws Exception { return map(filter, location, Map.of()); }
	protected ResultActions map(String filter, boolean location, Map<String, String> extra) throws Exception {
		var request = get("/api/v1/notes").header("Authorization", "Bearer " + token);
		Map<String, String> params = new java.util.HashMap<>(Map.of("minLatitude", "34.99", "minLongitude", "128.99",
			"maxLatitude", "35.01", "maxLongitude", "129.01", "filter", filter));
		if (location) { params.put("latitude", "35"); params.put("longitude", "129"); }
		params.putAll(extra);
		params.forEach(request::param);
		return mvc.perform(request);
	}

	protected ResultActions open(UUID id, String body) throws Exception {
		return mvc.perform(post("/api/v1/notes/{id}/open", id).header("Authorization", "Bearer " + token)
			.contentType(MediaType.APPLICATION_JSON).content(body));
	}

	protected JsonNode data(ResultActions result) throws Exception {
		return json.readTree(result.andReturn().getResponse().getContentAsString()).get("data");
	}
	protected List<String> ids(JsonNode array) {
		java.util.ArrayList<String> ids = new java.util.ArrayList<>();
		for (JsonNode note : array) ids.add(note.get("noteId").asText());
		return ids;
	}
}
