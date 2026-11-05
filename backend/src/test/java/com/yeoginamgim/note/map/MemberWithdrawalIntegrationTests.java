package com.yeoginamgim.note.map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import com.yeoginamgim.note.domain.NoteVisibility;

class MemberWithdrawalIntegrationTests extends MemberMapTestSupport {
    @Test
    void withdrawalKeepsNotesAnonymouslyAndRemovesAccountSessionsAndFriendship() throws Exception {
        var friendTokens = sessions.open(friend.getId());
        var publicNote = note(friend, NoteVisibility.PUBLIC, 10, "공개 기록");
        var friendsOnly = note(friend, NoteVisibility.FRIENDS, 10, "친구 기록");
        var privateNote = note(friend, NoteVisibility.PRIVATE, 10, "개인 기록");
        var originalId = friend.getId();
        String email = friend.getEmail();
        mvc.perform(delete("/api/v1/users/me").header("Authorization", "Bearer " + friendTokens.accessToken()))
            .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(jsonPath("$.data.withdrawn").value(true));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM app.users WHERE id = ? OR email = ?", Long.class, originalId, email)).isZero();
        UUID author = jdbc.queryForObject("SELECT author_user_id FROM app.notes WHERE id = ?", UUID.class, publicNote.getId());
        assertThat(author).isNotEqualTo(originalId);
        assertThat(jdbc.queryForObject("SELECT nickname FROM app.users WHERE id = ?", String.class, author)).isEqualTo("탈퇴한 사용자");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM app.notes WHERE author_user_id = ?", Long.class, author)).isEqualTo(3);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM app.friendships WHERE user_low = ? OR user_high = ?", Long.class, originalId, originalId)).isZero();
        mvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + friendTokens.accessToken())).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/refresh").contentType(MediaType.APPLICATION_JSON)
            .content("{\"refreshToken\":\"" + friendTokens.refreshToken() + "\"}"))
            .andExpect(status().isUnauthorized());
        open(publicNote.getId(), "{\"latitude\":35,\"longitude\":129}").andExpect(status().isOk());
        open(friendsOnly.getId(), "{\"latitude\":35,\"longitude\":129}").andExpect(status().isNotFound());
        open(privateNote.getId(), "{\"latitude\":35,\"longitude\":129}").andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/users/me")).andExpect(status().isUnauthorized());
    }
    @Test
    void linkedKakaoAccountCannotBeDeletedUntilProviderUnlinkIsAvailable() throws Exception {
        jdbc.execute("CREATE TABLE IF NOT EXISTS app.kakao_accounts (kakao_id BIGINT PRIMARY KEY, user_id UUID NOT NULL UNIQUE REFERENCES app.users(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL)");
        jdbc.update("INSERT INTO app.kakao_accounts (kakao_id, user_id, created_at) VALUES (?, ?, now())", 99999L, me.getId());
        mvc.perform(delete("/api/v1/users/me").header("Authorization", "Bearer " + token))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.error.code").value("KAKAO_UNLINK_REQUIRED"));
        mvc.perform(get("/api/v1/users/me").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
    }

}
