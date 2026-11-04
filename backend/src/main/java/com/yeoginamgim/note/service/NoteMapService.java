package com.yeoginamgim.note.service;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

import com.yeoginamgim.auth.service.AuthException;
import com.yeoginamgim.note.dto.NoteMapBoundsRequest;
import com.yeoginamgim.note.dto.MemberMapResponse;
import com.yeoginamgim.note.dto.MemberMapClusterResponse;
import com.yeoginamgim.note.dto.NoteMapClusterRequest;

@Service
public class NoteMapService {
	private final NoteActorProvider actors;
	private final ObjectProvider<MemberNoteMapService> members;

	public NoteMapService(NoteActorProvider actors, ObjectProvider<MemberNoteMapService> members) {
		this.actors = actors;
		this.members = members;
	}

	public MemberMapResponse find(String token, NoteMapBoundsRequest query) {
		var actor = actors.identify(token);
		MemberNoteMapService member = members.getIfAvailable();
		if (member == null) throw AuthException.unauthorized();
		return member.find(actor.id(), query);
	}

	public MemberMapClusterResponse findClusters(String token, NoteMapClusterRequest query) {
		var actor = actors.identify(token);
		MemberNoteMapService member = members.getIfAvailable();
		if (member == null) throw AuthException.unauthorized();
		return member.findClusters(actor.id(), query);
	}
}
