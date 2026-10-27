package com.yeoginamgim.note.service;

import java.util.UUID;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

import com.yeoginamgim.auth.service.AuthException;
import com.yeoginamgim.common.auth.CurrentUserProvider;
import com.yeoginamgim.guest.service.GuestSessionService;

@Component
public class NoteActorProvider {
	private final GuestSessionService guests;
	private final ObjectProvider<CurrentUserProvider> members;

	public NoteActorProvider(GuestSessionService guests, ObjectProvider<CurrentUserProvider> members) {
		this.guests = guests;
		this.members = members;
	}

	public Actor identify(String token) {
		// Issued guest tokens are 32 random bytes encoded as 43 base64url characters.
		// Every other format goes exclusively through member authentication; never fall back.
		if (token != null && token.matches("[A-Za-z0-9_-]{43}")) {
			return new Actor(guests.identify(token), false);
		}
		CurrentUserProvider member = members.getIfAvailable();
		if (member == null) throw AuthException.unauthorized();
		return new Actor(member.requireUserId(), true);
	}

	public record Actor(UUID id, boolean member) {}
}
