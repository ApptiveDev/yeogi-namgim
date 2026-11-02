package com.yeoginamgim.note.service;

import java.util.UUID;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

import com.yeoginamgim.auth.service.AuthException;
import com.yeoginamgim.common.auth.CurrentUserProvider;

@Component
public class NoteActorProvider {
	private final ObjectProvider<CurrentUserProvider> members;

	public NoteActorProvider(ObjectProvider<CurrentUserProvider> members) {
		this.members = members;
	}

	public Actor identify(String token) {
		CurrentUserProvider member = members.getIfAvailable();
		if (member == null) throw AuthException.unauthorized();
		return new Actor(member.requireUserId());
	}

	public record Actor(UUID id) {}
}
