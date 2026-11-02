package com.yeoginamgim.note.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;

import com.yeoginamgim.note.domain.Note;

public interface NoteRepository extends JpaRepository<Note, UUID> {
	Slice<Note> findByAuthorUserId(UUID authorUserId, Pageable pageable);
	Optional<Note> findByIdAndAuthorUserId(UUID id, UUID authorUserId);
}
