package com.nexus.chat.controller;

import com.nexus.chat.dto.response.RoomDTO;
import com.nexus.chat.entity.Room;
import com.nexus.chat.service.RandomMatchingService;
import com.nexus.chat.service.RoomService;
import com.nexus.chat.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * Handles random anonymous chat matching (Omegle-like functionality)
 */
@RestController
@RequestMapping("/api/random")
@RequiredArgsConstructor
@SuppressWarnings({"null", "nullness"})
public class RandomMatchingController {

    private final RandomMatchingService matchingService;
    private final RoomService roomService;
    private final UserService userService;

    @PostMapping("/start")
    @Transactional
    public ResponseEntity<?> findRandomMatch(@NonNull Authentication authentication) {
        return userService.findByUsername(authentication.getName())
                .map(user -> {
                    Room room = matchingService.findOrCreateMatch(user.getId());
                    if (room == null) {
                        return ResponseEntity.accepted().body(Map.of("status", "SEARCHING"));
                    }
                    return ResponseEntity.ok(roomService.toDTO(room));
                })
                .orElse(ResponseEntity.badRequest().build());
    }

    @PostMapping("/skip/{roomId}")
    @Transactional
    public ResponseEntity<RoomDTO> skipMatch(
            @NonNull @PathVariable UUID roomId,
            @NonNull Authentication authentication) {
        return userService.findByUsername(authentication.getName())
                .map(user -> {
                    Room newRoom = matchingService.skipMatch(roomId, user.getId());
                    return ResponseEntity.ok(roomService.toDTO(newRoom));
                })
                .orElse(ResponseEntity.badRequest().build());
    }

    @PostMapping("/stop")
    @Transactional
    public ResponseEntity<Map<String, String>> endMatch(
            @NonNull Authentication authentication) {
        return userService.findByUsername(authentication.getName())
                .map(user -> {
                    // Stop matching / leave queue or current match
                    // Front-end handles leaving the room using room API if connected
                    return ResponseEntity.ok(Map.of("message", "Stopped matching"));
                })
                .orElse(ResponseEntity.badRequest().build());
    }

    @GetMapping("/queue/status")
    public ResponseEntity<Map<String, Object>> getQueueStatus() {
        int waitingUsers = matchingService.getWaitingUsersCount();
        return ResponseEntity.ok(Map.of(
                "waitingUsers", waitingUsers,
                "estimatedWaitTime", waitingUsers > 0 ? "< 30 seconds" : "Finding match..."));
    }
}
