package com.yeoginamgim.location.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.yeoginamgim.location.domain.GuestLocation;

public interface GuestLocationRepository extends JpaRepository<GuestLocation, UUID> {
}
