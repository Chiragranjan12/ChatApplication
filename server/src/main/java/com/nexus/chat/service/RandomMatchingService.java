package com.nexus.chat.service;

import com.nexus.chat.entity.RandomMatchQueue;
import com.nexus.chat.entity.Room;
import com.nexus.chat.entity.Room.RoomType;
import com.nexus.chat.entity.User;
import com.nexus.chat.entity.RoomMember;
import com.nexus.chat.exception.UserNotFoundException;
import com.nexus.chat.repository.RandomMatchQueueRepository;
import com.nexus.chat.repository.RoomRepository;
import com.nexus.chat.repository.RoomMemberRepository;
import com.nexus.chat.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RandomMatchingService {

    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final RandomMatchQueueRepository queueRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public Room findOrCreateMatch(@NonNull UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        // Check if user is already in queue
        queueRepository.findByUserAndMatchedFalse(user)
                .ifPresent(existing -> {
                    queueRepository.delete(existing);
                });

        // Try to find an existing waiting user
        List<RandomMatchQueue> waiting = queueRepository.findWaitingUsers(userId);

        if (!waiting.isEmpty()) {
            // Match with first waiting user
            RandomMatchQueue partner = waiting.get(0);
            User partnerUser = partner.getUser();

            // Create room for the match
            Room room = Room.builder()
                    .name("Random Chat " + UUID.randomUUID().toString().substring(0, 8))
                    .type(RoomType.RANDOM)
                    .description("Random anonymous chat")
                    .isDeleted(false)
                    .build();

            room = roomRepository.save(room);
            
            RoomMember m1 = RoomMember.builder().room(room).user(user).joinedAt(LocalDateTime.now()).build();
            RoomMember m2 = RoomMember.builder().room(room).user(partnerUser).joinedAt(LocalDateTime.now()).build();
            roomMemberRepository.saveAll(List.of(m1, m2));

            // Mark both users as matched
            partner.setMatched(true);
            queueRepository.save(partner);

            // Notify partner about the match
            messagingTemplate.convertAndSendToUser(
                    partnerUser.getUsername(),
                    "/queue/match",
                    Map.of("type", "MATCH_FOUND", "roomId", room.getId().toString()));

            log.info("Matched users {} and {}", user.getUsername(), partnerUser.getUsername());

            return room;
        } else {
            // No one waiting, add to queue
            RandomMatchQueue queue = RandomMatchQueue.builder()
                    .user(user)
                    .matched(false)
                    .build();
            queueRepository.save(queue);

            log.info("User {} added to matching queue", user.getUsername());

            // Return null to indicate waiting
            return null;
        }
    }

    @Transactional
    public Room skipMatch(@NonNull UUID roomId, @NonNull UUID userId) {
        // Leave current room
        Room currentRoom = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        roomMemberRepository.findByRoomIdAndUserId(roomId, userId)
                .ifPresent(roomMemberRepository::delete);

        // Notify other participant
        currentRoom.getMembers().forEach(member -> {
            messagingTemplate.convertAndSendToUser(
                    member.getUser().getUsername(),
                    "/queue/match",
                    Map.of("type", "PARTNER_SKIPPED"));
        });

        // Mark room for deletion if empty
        if (roomMemberRepository.existsByRoomIdAndUserId(roomId, userId)) {
             // Still exists? No, we deleted it above. Let's check count.
        }
        
        // This logic needs to be careful about deleted members
        long memberCount = currentRoom.getMembers().size(); 
        if (memberCount <= 1) { // If only 1 left after deletion (or 0)
             currentRoom.setDeleted(true);
             currentRoom.setDeletedAt(LocalDateTime.now());
             roomRepository.save(currentRoom);
        }

        // Find new match
        return findOrCreateMatch(userId);
    }

    @Transactional
    public void endMatch(@NonNull UUID roomId, @NonNull UUID userId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        roomMemberRepository.findByRoomIdAndUserId(roomId, userId)
                .ifPresent(roomMemberRepository::delete);

        // Notify other participant
        room.getMembers().forEach(member -> {
            messagingTemplate.convertAndSendToUser(
                    member.getUser().getUsername(),
                    "/queue/match",
                    Map.of("type", "PARTNER_LEFT"));
        });

        // Delete room if empty
        if (room.getMembers().size() <= 1) {
            room.setDeleted(true);
            room.setDeletedAt(LocalDateTime.now());
            roomRepository.save(room);
        }

        // Remove from queue if present
        queueRepository.findByUserAndMatchedFalse(user)
                .ifPresent(queueRepository::delete);
    }

    public int getWaitingUsersCount() {
        return queueRepository.countWaitingUsers();
    }

    // Clean up old queue entries every hour
    @Scheduled(fixedRate = 3600000)
    @Transactional
    public void cleanupOldQueueEntries() {
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        queueRepository.deleteOldEntries(oneHourAgo);
        log.info("Cleaned up old queue entries");
    }
}
