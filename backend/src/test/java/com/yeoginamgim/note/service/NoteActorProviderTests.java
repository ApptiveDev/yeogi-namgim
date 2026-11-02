package com.yeoginamgim.note.service;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import com.yeoginamgim.auth.service.AuthException;
import com.yeoginamgim.common.auth.CurrentUserProvider;
class NoteActorProviderTests {
    @SuppressWarnings("unchecked")
    private final ObjectProvider<CurrentUserProvider> members = mock(ObjectProvider.class);
    private final NoteActorProvider actors = new NoteActorProvider(members);
    @Test void requiresMemberAuthenticationEvenForLegacyGuestToken() {
        var current = mock(CurrentUserProvider.class);
        when(members.getIfAvailable()).thenReturn(current);
        when(current.requireUserId()).thenThrow(AuthException.unauthorized());
        assertThatThrownBy(() -> actors.identify("g".repeat(43))).isInstanceOf(AuthException.class);
        verify(current).requireUserId();
    }
    @Test void rejectsWhenMemberAuthenticationIsDisabled() {
        assertThatThrownBy(() -> actors.identify("token")).isInstanceOf(AuthException.class);
    }
    @Test void identifiesAuthenticatedMember() {
        var current = mock(CurrentUserProvider.class);
        UUID id = UUID.randomUUID();
        when(members.getIfAvailable()).thenReturn(current);
        when(current.requireUserId()).thenReturn(id);
        assertThat(actors.identify("member-token").id()).isEqualTo(id);
    }
}
