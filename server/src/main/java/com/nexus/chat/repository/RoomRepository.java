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

    @EntityGraph(attributePaths = { "members", "createdBy" })
    List<Room> findByTypeAndIsDeletedFalse(RoomType type);

    @EntityGraph(attributePaths = { "members", "createdBy" })
    Page<Room> findByTypeAndIsDeletedFalse(RoomType type, Pageable pageable);

    @EntityGraph(attributePaths = { "members", "members.user", "createdBy" })
    @Query("SELECT r FROM Room r JOIN r.members m WHERE m.user.id = :userId AND r.isDeleted = false")
    List<Room> findUserRooms(@Param("userId") UUID userId);

    @Query("SELECT r FROM Room r JOIN r.members m WHERE m.user.id = :userId AND r.id = :roomId")
    Optional<Room> findByIdAndParticipant(@Param("roomId") UUID roomId, @Param("userId") UUID userId);

    @Query("SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END FROM Room r JOIN r.members m WHERE r.id = :roomId AND m.user.id = :userId")
    boolean existsByIdAndParticipantId(@Param("roomId") UUID roomId, @Param("userId") UUID userId);

    @Query("SELECT r FROM Room r " +
           "JOIN r.members m1 " +
           "JOIN r.members m2 " +
           "WHERE r.type = 'DIRECT' " +
           "AND m1.user.id = :user1Id " +
           "AND m2.user.id = :user2Id " +
           "AND r.isDeleted = false")
    Optional<Room> findDirectRoom(@Param("user1Id") UUID user1Id, @Param("user2Id") UUID user2Id);
}
