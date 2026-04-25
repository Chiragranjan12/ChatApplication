package com.nexus.chat.repository;

import com.nexus.chat.entity.Room;
import com.nexus.chat.entity.Room.RoomType;
import com.nexus.chat.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoomRepository extends JpaRepository<Room, UUID> {

    Optional<Room> findByIdAndIsDeletedFalse(UUID id);

    Optional<Room> findByInviteCode(String inviteCode);

    // ========================================================================
    // APPROACH A: @EntityGraph - Best for fetching rooms with members
    // ========================================================================
    
    /**
     * APPROACH A: @EntityGraph
     * Best for: When you always need members + user details for a room
     * 
     * SQL Output (1 query):
     * SELECT r.*, rm.*, u.* FROM rooms r
     * LEFT JOIN room_members rm ON r.id = rm.room_id
     * LEFT JOIN users u ON rm.user_id = u.id
     * WHERE r.type = ? AND r.is_deleted = false
     */
    @EntityGraph(attributePaths = { "members", "members.user", "createdBy" })
    List<Room> findByTypeAndIsDeletedFalse(RoomType type);

    @EntityGraph(attributePaths = { "members", "members.user", "createdBy" })
    Page<Room> findByTypeAndIsDeletedFalse(RoomType type, Pageable pageable);

    // ========================================================================
    // APPROACH B: JOIN FETCH - For specific user rooms query
    // ========================================================================
    
    /**
     * APPROACH B: JOIN FETCH
     * Best for: Complex queries with specific conditions
     * 
     * SQL Output (1 query):
     * SELECT r.*, rm.*, u.* FROM rooms r
     * JOIN room_members rm ON r.id = rm.room_id
     * LEFT JOIN users u ON rm.user_id = u.id
     * WHERE rm.user_id = :userId AND r.is_deleted = false
     */
    @EntityGraph(attributePaths = { "members", "members.user", "createdBy" })
    @Query("SELECT DISTINCT r FROM Room r JOIN r.members m WHERE m.user.id = :userId AND r.isDeleted = false")
    List<Room> findUserRooms(@Param("userId") UUID userId);

    @Query("SELECT r FROM Room r JOIN r.members m WHERE m.user.id = :userId AND r.id = :roomId")
    Optional<Room> findByIdAndParticipant(@Param("roomId") UUID roomId, @Param("userId") UUID userId);

    @Query("SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END FROM Room r JOIN r.members m WHERE r.id = :roomId AND m.user.id = :userId")
    boolean existsByIdAndParticipantId(@Param("roomId") UUID roomId, @Param("userId") UUID userId);

    /**
     * Find direct room between two users
     * 
     * SQL Output (1 query):
     * SELECT r.* FROM rooms r
     * JOIN room_members m1 ON r.id = m1.room_id
     * JOIN room_members m2 ON r.id = m2.room_id
     * WHERE r.type = 'DIRECT' 
     * AND m1.user_id = :user1Id 
     * AND m2.user_id = :user2Id 
     * AND r.is_deleted = false
     */
    @Query("SELECT r FROM Room r " +
           "JOIN r.members m1 " +
           "JOIN r.members m2 " +
           "WHERE r.type = 'DIRECT' " +
           "AND m1.user.id = :user1Id " +
           "AND m2.user.id = :user2Id " +
           "AND r.isDeleted = false")
    Optional<Room> findDirectRoom(@Param("user1Id") UUID user1Id, @Param("user2Id") UUID user2Id);
    
    /**
     * Find room with all members eagerly loaded
     * Use this when you need to display room member list
     */
    @EntityGraph(attributePaths = { "members", "members.user", "createdBy" })
    Optional<Room> findWithMembersById(UUID id);
}
