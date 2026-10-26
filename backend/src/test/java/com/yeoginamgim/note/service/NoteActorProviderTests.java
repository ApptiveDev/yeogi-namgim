package com.yeoginamgim.note.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

import com.yeoginamgim.auth.service.AuthException;
import com.yeoginamgim.common.auth.CurrentUserProvider;
import com.yeoginamgim.guest.service.GuestSessionService;
import com.yeoginamgim.guest.service.InvalidGuestTokenException;

class NoteActorProviderTests {
	private final GuestSessionService guests = mock(GuestSessionService.class);
	@SuppressWarnings("unchecked")
	private final ObjectProvider<CurrentUserProvider> members = mock(ObjectProvider.class);
	private final NoteActorProvider actors = new NoteActorProvider(guests, members);

	@Test
	void guestAuthenticationDoesNotRequireMemberFeatureToBeEnabled() {
		UUID id = UUID.randomUUID();
		String token = "g".repeat(43);
		when(guests.identify(token)).thenReturn(id);
		assertThat(actors.identify(token)).isEqualTo(new NoteActorProvider.Actor(id, false));
		verifyNoInteractions(members);
	}

	@Test
	void failedMemberAuthenticationNeverFallsBackToGuest() {
		CurrentUserProvider current = mock(CurrentUserProvider.class);
		when(members.getIfAvailable()).thenReturn(current);
		when(current.requireUserId()).thenThrow(AuthException.unauthorized());
		assertThatThrownBy(() -> actors.identify("header.payload.signature")).isInstanceOf(AuthException.class);
		verifyNoInteractions(guests);
	}

	@Test
	void failedGuestAuthenticationNeverFallsBackToMember() {
		String token = "g".repeat(43);
		when(guests.identify(token)).thenThrow(new InvalidGuestTokenException());
		assertThatThrownBy(() -> actors.identify(token)).isInstanceOf(InvalidGuestTokenException.class);
		verifyNoInteractions(members);
	}

	@Test
	void memberTokenIsRejectedWhenMemberAuthenticationIsDisabled() {
		assertThatThrownBy(() -> actors.identify("header.payload.signature")).isInstanceOf(AuthException.class);
		verifyNoInteractions(guests);
	}
}
