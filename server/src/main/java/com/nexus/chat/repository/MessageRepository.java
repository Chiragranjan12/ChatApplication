package com.nexus.chat.repository;

import com.nexus.chat.entity.Message;
import com.nexus.chat.entity.Room;
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

    @EntityGraph(attributePaths = { "sender", "room" })
    Page<Message> findByRoomOrderByCreatedAtDesc(Room room, Pageable pageable);

    @EntityGraph(attributePaths = { "sender", "room" })
    List<Message> findByRoomOrderByCreatedAtAsc(Room room);

    @Query("SELECT m FROM Message m JOIN FETCH m.sender JOIN FETCH m.room WHERE m.room.id = :roomId ORDER BY m.createdAt ASC")
    List<Message> findMessagesByRoomId(@Param("roomId") UUID roomId);

    @Query("SELECT m FROM Message m JOIN FETCH m.sender JOIN FETCH m.room WHERE m.room.id = :roomId AND m.createdAt > :since ORDER BY m.createdAt ASC")
    List<Message> findRecentMessagesByRoomId(@Param("roomId") UUID roomId, @Param("since") LocalDateTime since);

    long countByRoom(Room room);
}
