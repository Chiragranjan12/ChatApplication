package com.nexus.chat.controller;

import com.nexus.chat.dto.request.CreateRoomRequest;
import com.nexus.chat.dto.response.RoomDTO;
import com.nexus.chat.entity.Room;
import com.nexus.chat.service.RoomService;
import com.nexus.chat.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
@SuppressWarnings({"null", "nullness"})
public class RoomController {

    private final RoomService roomService;
    private final UserService userService;

    /**
     * Fix #1: Frontend calls GET /api/rooms to load the current user's rooms.
     * Previously only /public and /my-rooms existed, causing 404 on initial load.
     */
    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<RoomDTO>> getMyRooms(@NonNull Authentication authentication) {
        return userService.findByUsername(authentication.getName())
                .map(user -> ResponseEntity.ok(roomService.getUserRooms(user.getId())))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/public")
    @Transactional(readOnly = true)
    public ResponseEntity<List<RoomDTO>> getPublicRooms() {
        return ResponseEntity.ok(roomService.getPublicRooms());
    }

    @GetMapping("/my-rooms")
    @Transactional(readOnly = true)
    public ResponseEntity<List<RoomDTO>> getMyRoomsExplicit(@NonNull Authentication authentication) {
        return userService.findByUsername(authentication.getName())
                .map(user -> ResponseEntity.ok(roomService.getUserRooms(user.getId())))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Fix #7: Membership check for private/direct rooms — prevents invite code leakage.
     */
    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<RoomDTO> getRoomById(
            @NonNull @PathVariable UUID id,
            @NonNull Authentication authentication) {
        return userService.findByUsername(authentication.getName())
                .map(user -> {
                    try {
                        Room room = roomService.getRoomDetails(id, user.getId());
                        return ResponseEntity.ok(roomService.toDTO(room));
                    } catch (com.nexus.chat.exception.UnauthorizedException e) {
                        return ResponseEntity.status(403).<RoomDTO>build();
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Transactional
    public ResponseEntity<RoomDTO> createRoom(
            @Valid @NonNull @RequestBody CreateRoomRequest request,
            @NonNull Authentication authentication) {
        return userService.findByUsername(authentication.getName())
                .map(user -> {
                    Room room = roomService.createRoom(
                            request.getName(),
                            request.getType(),
                            request.getDescription(),
                            user.getId());
                    RoomDTO roomDTO = roomService.toDTO(room);

                    return ResponseEntity.ok(roomDTO);
                })
                .orElse(ResponseEntity.badRequest().build());
    }

    @PostMapping("/direct/{userId}")
    @Transactional
    public ResponseEntity<RoomDTO> createDirectRoom(
            @NonNull @PathVariable UUID userId,
            @NonNull Authentication authentication) {
        return userService.findByUsername(authentication.getName())
                .map(currentUser -> {
                    Room room = roomService.getOrCreateDirectRoom(currentUser.getId(), userId);
                    return ResponseEntity.ok(roomService.toDTO(room));
                })
                .orElse(ResponseEntity.badRequest().build());
    }

    /**
     * Fix #4: Validate that name is not blank before creating a private group.
     */
    @PostMapping("/private")
    @Transactional
    public ResponseEntity<RoomDTO> createPrivateGroup(
            @RequestBody Map<String, String> body,
            @NonNull Authentication authentication) {
        String name = body.get("name");
        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return userService.findByUsername(authentication.getName())
                .map(user -> {
                    Room room = roomService.createRoom(name, Room.RoomType.PRIVATE_GROUP, null, user.getId());
                    return ResponseEntity.ok(roomService.toDTO(room));
                })
                .orElse(ResponseEntity.badRequest().build());
    }

    @PostMapping("/join")
    @Transactional
    public ResponseEntity<RoomDTO> joinRoomByInvite(
            @RequestBody Map<String, String> body,
            @NonNull Authentication authentication) {
        String inviteCode = body.get("inviteCode");
        if (inviteCode == null || inviteCode.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return userService.findByUsername(authentication.getName())
                .map(user -> {
                    Room room = roomService.joinByInviteCode(user.getId(), inviteCode);
                    RoomDTO roomDTO = roomService.toDTO(room);

                    return ResponseEntity.ok(roomDTO);
                })
                .orElse(ResponseEntity.badRequest().build());
    }

    @PostMapping("/{id}/join")
    @Transactional
    public ResponseEntity<RoomDTO> joinRoom(
            @NonNull @PathVariable UUID id,
            @NonNull Authentication authentication) {
        return userService.findByUsername(authentication.getName())
                .map(user -> {
                    // RoomService.joinRoom now throws UnauthorizedException for PRIVATE_GROUP / DIRECT
                    Room room = roomService.joinRoom(id, user.getId());
                    RoomDTO roomDTO = roomService.toDTO(room);

                    return ResponseEntity.ok(roomDTO);
                })
                .orElse(ResponseEntity.badRequest().build());
    }

    @PostMapping("/{id}/leave")
    @Transactional
    public ResponseEntity<Map<String, String>> leaveRoom(
            @NonNull @PathVariable UUID id,
            @NonNull Authentication authentication) {
        return userService.findByUsername(authentication.getName())
                .map(user -> {
                    roomService.leaveRoom(id, user.getId());

                    return ResponseEntity.ok(Map.of("message", "Left room successfully"));
                })
                .orElse(ResponseEntity.badRequest().build());
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Map<String, String>> deleteRoom(
            @NonNull @PathVariable UUID id,
            @NonNull Authentication authentication) {
        return userService.findByUsername(authentication.getName())
                .map(user -> {
                    roomService.deleteRoom(id, user.getId());

                    return ResponseEntity.ok(Map.of("message", "Room deleted successfully"));
                })
                .orElse(ResponseEntity.badRequest().build());
    }

    @PostMapping("/{id}/kick/{userIdToKick}")
    @Transactional
    public ResponseEntity<Map<String, String>> kickUser(
            @NonNull @PathVariable UUID id,
            @NonNull @PathVariable UUID userIdToKick,
            @NonNull Authentication authentication) {
        return userService.findByUsername(authentication.getName())
                .map(user -> {
                    roomService.kickUser(id, userIdToKick, user.getId());
                    return ResponseEntity.ok(Map.of("message", "User kicked successfully"));
                })
                .orElse(ResponseEntity.badRequest().build());
    }
}
