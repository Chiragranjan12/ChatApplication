package com.nexus.chat.repository;

import com.nexus.chat.entity.RoomMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoomMemberRepository extends JpaRepository<RoomMember, UUID> {
    Optional<RoomMember> findByRoomIdAndUserId(UUID roomId, UUID userId);
    boolean existsByRoomIdAndUserId(UUID roomId, UUID userId);
}
