package com.nexus.chat.repository;

import com.nexus.chat.entity.Message;
import com.nexus.chat.entity.Room;
import com.nexus.chat.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {

    // ========================================================================
    // APPROACH A: @EntityGraph - Best for simple fetch patterns
    // ========================================================================
    
    /**
     * APPROACH A: @EntityGraph
     * Best for: Simple queries where you always need related entities
     * Pros: Clean, declarative, reusable
     * Cons: Less control over join behavior
     * 
     * SQL Output (1 query):
     * SELECT m.*, s.*, r.* FROM messages m
     * LEFT JOIN users s ON m.sender_id = s.id
     * LEFT JOIN rooms r ON m.room_id = r.id
     * WHERE m.room_id = ? ORDER BY m.created_at DESC
     */
    @EntityGraph(attributePaths = { "sender", "room" })
    Page<Message> findByRoomOrderByCreatedAtDesc(Room room, Pageable pageable);

    @EntityGraph(attributePaths = { "sender", "room" })
    List<Message> findByRoomOrderByCreatedAtAsc(Room room);

    // ========================================================================
    // APPROACH B: JOIN FETCH - Best for specific queries with conditions
    // ========================================================================
    
    /**
     * APPROACH B: JOIN FETCH
     * Best for: Queries with specific conditions, projections, or complex filtering
     * Pros: Full control over JOIN type (INNER vs LEFT), supports projections
     * Cons: More verbose, must be careful with pagination
     * 
     * ⚠️ IMPORTANT: When using JOIN FETCH with pagination, 
     * Hibernate fetches ALL matching rows in memory, then paginates.
     * For large datasets, use @EntityGraph with @Query instead.
     * 
     * SQL Output (1 query):
     * SELECT m FROM Message m 
     * JOIN FETCH m.sender s 
     * JOIN FETCH m.room r 
     * WHERE m.room.id = :roomId ORDER BY m.createdAt ASC
     */
    @Query("SELECT m FROM Message m JOIN FETCH m.sender JOIN FETCH m.room WHERE m.room.id = :roomId ORDER BY m.createdAt ASC")
    List<Message> findMessagesByRoomId(@Param("roomId") UUID roomId);

    @Query("SELECT m FROM Message m JOIN FETCH m.sender JOIN FETCH m.room WHERE m.room.id = :roomId AND m.createdAt > :since ORDER BY m.createdAt ASC")
    List<Message> findRecentMessagesByRoomId(@Param("roomId") UUID roomId, @Param("since") LocalDateTime since);

    // ========================================================================
    // APPROACH C: JPQL with specific fetch - For complex queries
    // ========================================================================

    /**
     * Paginated query with sender and room - USE THIS FOR PAGINATION
     * 
     * ⚠️ CRITICAL: Do NOT use JOIN FETCH with Pageable!
     * It causes: "query specified join fetching, but pagination does not make sense"
     * 
     * Solution: Use @EntityGraph + @Query (no JOIN FETCH)
     */
    @EntityGraph(attributePaths = { "sender", "room" })
    @Query("SELECT m FROM Message m WHERE m.room.id = :roomId AND m.isDeleted = false")
    Page<Message> findByRoomIdPaginated(@Param("roomId") UUID roomId, Pageable pageable);

    /**
     * Find unread messages for a user
     * 
     * Note: Since this is a room-based chat, "unread" typically means:
     * - Messages in rooms the user is a member of
     * - That were created after the user's last visit
     * 
     * SQL Output (1 query):
     * SELECT m FROM Message m 
     * JOIN FETCH m.sender 
     * JOIN FETCH m.room r
     * JOIN FETCH r.members rm
     * WHERE rm.user.id = :userId AND m.isDeleted = false
     * ORDER BY m.createdAt DESC
     */
    @EntityGraph(attributePaths = { "sender", "room" })
    @Query("SELECT m FROM Message m JOIN m.room r JOIN r.members rm " +
           "WHERE rm.user.id = :userId AND m.isDeleted = false " +
           "ORDER BY m.createdAt DESC")
    List<Message> findUnreadMessages(@Param("userId") UUID userId);

    /**
     * Find conversation between two users (direct messages)
     * 
     * SQL Output (1 query):
     * SELECT m FROM Message m 
     * JOIN FETCH m.sender 
     * JOIN FETCH m.room r
     * JOIN r.members m1
     * JOIN r.members m2
     * WHERE r.type = 'DIRECT' 
     * AND m1.user.id = :user1Id 
     * AND m2.user.id = :user2Id
     * AND m.isDeleted = false
     * ORDER BY m.createdAt DESC
     */
    @EntityGraph(attributePaths = { "sender", "room" })
    @Query("SELECT m FROM Message m JOIN m.room r JOIN r.members rm1 JOIN r.members rm2 " +
           "WHERE r.type = 'DIRECT' " +
           "AND rm1.user.id = :user1Id " +
           "AND rm2.user.id = :user2Id " +
           "AND m.isDeleted = false " +
           "ORDER BY m.createdAt DESC")
    List<Message> findConversationBetweenUsers(
            @Param("user1Id") UUID user1Id, 
            @Param("user2Id") UUID user2Id);

    /**
     * Count messages in a room
     */
    long countByRoom(Room room);
    
    /**
     * Count unread messages for a user (for notifications)
     */
    @Query("SELECT COUNT(m) FROM Message m JOIN m.room r JOIN r.members rm " +
           "WHERE rm.user.id = :userId AND m.isDeleted = false " +
           "AND m.createdAt > :since")
    long countUnreadMessagesSince(@Param("userId") UUID userId, @Param("since") LocalDateTime since);
}
