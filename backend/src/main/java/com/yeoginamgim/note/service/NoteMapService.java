package com.yeoginamgim.note.service;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

import com.yeoginamgim.auth.service.AuthException;
import com.yeoginamgim.note.domain.NoteMapFilter;
import com.yeoginamgim.note.dto.NoteMapBoundsRequest;

@Service
public class NoteMapService {
	private final NoteActorProvider actors;
	private final NoteService guests;
	private final ObjectProvider<MemberNoteMapService> members;

	public NoteMapService(NoteActorProvider actors, NoteService guests, ObjectProvider<MemberNoteMapService> members) {
		this.actors = actors;
		this.guests = guests;
		this.members = members;
	}

	public Object find(String token, NoteMapBoundsRequest query) {
		var actor = actors.identify(token);
		if (!actor.member()) {
			if (query.filter() != NoteMapFilter.ALL || query.page() != 0 || query.size() != 100) {
				throw new InvalidNoteRequestException("지도 필터와 페이지 조회에는 회원 인증이 필요합니다.");
			}
			return guests.findMarkers(token, query);
		}
		MemberNoteMapService member = members.getIfAvailable();
		if (member == null) throw AuthException.unauthorized();
		return member.find(actor.id(), query);
	}
}
