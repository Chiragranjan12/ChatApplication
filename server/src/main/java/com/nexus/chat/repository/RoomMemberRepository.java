package com.nexus.chat.repository;

import com.nexus.chat.entity.RoomMember;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoomMemberRepository extends JpaRepository<RoomMember, UUID> {

    // ========================================================================
    // Basic queries
    // ========================================================================
    
    Optional<RoomMember> findByRoomIdAndUserId(UUID roomId, UUID userId);
    
    boolean existsByRoomIdAndUserId(UUID roomId, UUID userId);

    // ========================================================================
    // OPTIMIZED: Fetch user details with member - solves N+1 for member lists
    // ========================================================================
    
    /**
     * APPROACH A: @EntityGraph
     * Best for: Fetching all members of a room with user details
     * 
     * SQL Output (1 query):
     * SELECT rm.*, u.* FROM room_members rm
     * JOIN users u ON rm.user_id = u.id
     * WHERE rm.room_id = :roomId
     */
    @EntityGraph(attributePaths = { "user" })
    List<RoomMember> findByRoomId(UUID roomId);

    /**
     * APPROACH B: JOIN FETCH
     * Alternative for specific member queries
     */
    @Query("SELECT rm FROM RoomMember rm JOIN FETCH rm.user WHERE rm.room.id = :roomId")
    List<RoomMember> findMembersWithUserByRoomId(@Param("roomId") UUID roomId);

    /**
     * Find members by user ID (all rooms a user belongs to)
     */
    @EntityGraph(attributePaths = { "room", "user" })
    List<RoomMember> findByUserId(UUID userId);
    
    /**
     * Count members in a room
     */
    long countByRoomId(UUID roomId);
}
