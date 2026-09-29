package com.yeoginamgim.note.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.yeoginamgim.note.domain.Note;

public interface NoteRepository extends JpaRepository<Note, UUID> {
}
