package com.nexus.chat.repository;

import com.nexus.chat.entity.RandomMatchQueue;
import com.nexus.chat.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RandomMatchQueueRepository extends JpaRepository<RandomMatchQueue, UUID> {

    Optional<RandomMatchQueue> findByUserAndMatchedFalse(User user);

    @Query("SELECT q FROM RandomMatchQueue q WHERE q.matched = false AND q.user.id != :userId ORDER BY q.createdAt ASC")
    List<RandomMatchQueue> findWaitingUsers(UUID userId);

    @Query("SELECT COUNT(q) FROM RandomMatchQueue q WHERE q.matched = false")
    int countWaitingUsers();

    @Query("DELETE FROM RandomMatchQueue q WHERE q.createdAt < :before")
    void deleteOldEntries(LocalDateTime before);
}
