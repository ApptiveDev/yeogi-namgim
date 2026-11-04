package com.yeoginamgim.note.service;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

import com.yeoginamgim.auth.service.AuthException;
import com.yeoginamgim.note.access.LocationQualityPolicy;
import com.yeoginamgim.note.dto.NoteMapBoundsRequest;
import com.yeoginamgim.note.dto.MemberMapResponse;

@Service
public class NoteMapService {
	private final NoteActorProvider actors;
	private final ObjectProvider<MemberNoteMapService> members;
	private final LocationQualityPolicy locationQuality;

	public NoteMapService(NoteActorProvider actors, ObjectProvider<MemberNoteMapService> members,
		LocationQualityPolicy locationQuality) {
		this.actors = actors;
		this.members = members;
		this.locationQuality = locationQuality;
	}

	public MemberMapResponse find(String token, NoteMapBoundsRequest query) {
		var actor = actors.identify(token);
		MemberNoteMapService member = members.getIfAvailable();
		if (member == null) throw AuthException.unauthorized();
		locationQuality.requireValid(query.location());
		return member.find(actor.id(), query);
	}
}
