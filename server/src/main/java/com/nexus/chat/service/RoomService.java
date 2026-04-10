package com.nexus.chat.service;

import com.nexus.chat.dto.response.RoomDTO;
import com.nexus.chat.entity.Room;
import com.nexus.chat.entity.Room.RoomType;
import com.nexus.chat.entity.User;
import com.nexus.chat.entity.RoomMember;
import com.nexus.chat.exception.RoomNotFoundException;
import com.nexus.chat.exception.UnauthorizedException;
import com.nexus.chat.exception.UserNotFoundException;
import com.nexus.chat.repository.RoomRepository;
import com.nexus.chat.repository.RoomMemberRepository;
import com.nexus.chat.repository.UserRepository;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@SuppressWarnings("nullness")
public class RoomService {

    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final com.nexus.chat.repository.RoomMemberRepository roomMemberRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public Room createRoom(@NonNull String name, @NonNull RoomType type, String description, @NonNull UUID createdBy) {
        User creator = userRepository.findById(createdBy)
                .orElseThrow(() -> new UserNotFoundException("User not found with id: " + createdBy));

        String inviteCode = null;
        if (type == RoomType.PRIVATE_GROUP) {
            inviteCode = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        }

        Room room = Room.builder()
                .name(name)
                .type(type)
                .description(description)
                .inviteCode(inviteCode)
                .createdBy(creator)
                .isDeleted(false)
                .build();

        room = roomRepository.save(room);

        RoomMember member = RoomMember.builder()
                .room(room)
                .user(creator)
                .joinedAt(LocalDateTime.now())
                .build();
        roomMemberRepository.save(member);

        if (type == RoomType.PUBLIC) {
            messagingTemplate.convertAndSend("/topic/rooms",
                    java.util.Map.of("type", "ROOM_CREATED", "room", toDTO(room)));
        }

        return room;
    }

    @Transactional
    public Room getOrCreateDirectRoom(@NonNull UUID user1Id, @NonNull UUID user2Id) {
        return roomRepository.findDirectRoom(user1Id, user2Id)
                .orElseGet(() -> {
                    User user1 = userRepository.findById(user1Id)
                            .orElseThrow(() -> new UserNotFoundException("User not found: " + user1Id));
                    User user2 = userRepository.findById(user2Id)
                            .orElseThrow(() -> new UserNotFoundException("User not found: " + user2Id));

                    Room room = Room.builder()
                            .name("Direct Chat")
                            .type(RoomType.DIRECT)
                            .isDeleted(false)
                            .build();
                    room = roomRepository.save(room);

                    RoomMember m1 = RoomMember.builder().room(room).user(user1).joinedAt(LocalDateTime.now()).build();
                    RoomMember m2 = RoomMember.builder().room(room).user(user2).joinedAt(LocalDateTime.now()).build();
                    roomMemberRepository.saveAll(List.of(m1, m2));

                    return room;
                });
    }

    @Transactional
    public Room joinByInviteCode(@NonNull UUID userId, @NonNull String inviteCode) {
        Room room = roomRepository.findByInviteCode(inviteCode)
                .orElseThrow(() -> new RoomNotFoundException("Invalid invite code: " + inviteCode));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));

        if (roomMemberRepository.existsByRoomIdAndUserId(room.getId(), userId)) {
            return room;
        }

        RoomMember member = RoomMember.builder()
                .room(room)
                .user(user)
                .joinedAt(LocalDateTime.now())
                .build();
        roomMemberRepository.save(member);

        messagingTemplate.convertAndSend("/topic/room/" + room.getId(),
                java.util.Map.of("type", "USER_JOINED", "user", userService.toDTO(user)));

        return room;
    }

    @Transactional(readOnly = true)
    public List<RoomDTO> getPublicRooms() {
        return roomRepository.findByTypeAndIsDeletedFalse(RoomType.PUBLIC).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RoomDTO> getUserRooms(@NonNull UUID userId) {
        return userRepository.findById(userId)
                .map(user -> roomRepository.findUserRooms(userId).stream()
                        .map(this::toDTO)
                        .collect(Collectors.toList()))
                .orElse(List.of());
    }

    @Transactional
    public Room joinRoom(@NonNull UUID roomId, @NonNull UUID userId) {
        Room room = roomRepository.findByIdAndIsDeletedFalse(roomId)
                .orElseThrow(() -> new RoomNotFoundException("Room not found with id: " + roomId));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found with id: " + userId));

        // Check if user is already in the room
        if (roomMemberRepository.existsByRoomIdAndUserId(roomId, userId)) {
            return room;
        }

        // PRIVATE_GROUP rooms can ONLY be joined via invite code (POST /rooms/join)
        if (room.getType() == RoomType.PRIVATE_GROUP) {
            throw new UnauthorizedException("Cannot join a private group without an invite code");
        }

        // DIRECT rooms cannot be joined freely either
        if (room.getType() == RoomType.DIRECT) {
            throw new UnauthorizedException("Cannot join a direct message room");
        }

        RoomMember member = RoomMember.builder()
                .room(room)
                .user(user)
                .joinedAt(LocalDateTime.now())
                .build();
        roomMemberRepository.save(member);

        messagingTemplate.convertAndSend("/topic/room/" + room.getId(),
                java.util.Map.of("type", "USER_JOINED", "user", userService.toDTO(user)));

        return room;
    }

    @Transactional
    public Room leaveRoom(@NonNull UUID roomId, @NonNull UUID userId) {
        Room room = roomRepository.findByIdAndIsDeletedFalse(roomId)
                .orElseThrow(() -> new RoomNotFoundException("Room not found with id: " + roomId));

        roomMemberRepository.findByRoomIdAndUserId(roomId, userId)
                .ifPresent(roomMemberRepository::delete);

        messagingTemplate.convertAndSend("/topic/room/" + roomId,
                java.util.Map.of("type", "USER_LEFT", "userId", userId.toString()));

        // If room is empty and it's a random room, delete it
        // Note: Using roomMemberRepository.countByRoomId would be more efficient
        return room;
    }

    @Transactional
    public void deleteRoom(@NonNull UUID roomId, @NonNull UUID userId) {
        Room room = roomRepository.findByIdAndIsDeletedFalse(roomId)
                .orElseThrow(() -> new RoomNotFoundException("Room not found with id: " + roomId));

        // Only creator can delete the room
        if (room.getCreatedBy() == null || !room.getCreatedBy().getId().equals(userId)) {
            throw new UnauthorizedException("Only room creator can delete the room");
        }

        // Soft delete
        room.setDeleted(true);
        room.setDeletedAt(LocalDateTime.now());
        roomRepository.save(room);

        messagingTemplate.convertAndSend("/topic/rooms",
                java.util.Map.of("type", "ROOM_DELETED", "roomId", roomId.toString()));
    }

    @Transactional
    public void kickUser(@NonNull UUID roomId, @NonNull UUID userIdToKick, @NonNull UUID requestingUserId) {
        Room room = roomRepository.findByIdAndIsDeletedFalse(roomId)
                .orElseThrow(() -> new RoomNotFoundException("Room not found with id: " + roomId));

        if (room.getCreatedBy() == null || !room.getCreatedBy().getId().equals(requestingUserId)) {
            throw new UnauthorizedException("Only room creator can kick users");
        }

        if (room.getCreatedBy().getId().equals(userIdToKick)) {
            throw new UnauthorizedException("Cannot kick the room owner");
        }

        roomMemberRepository.findByRoomIdAndUserId(roomId, userIdToKick)
                .ifPresent(roomMemberRepository::delete);

        messagingTemplate.convertAndSend("/topic/room/" + roomId,
                java.util.Map.of("type", "USER_LEFT", "userId", userIdToKick.toString()));
    }

    @Transactional(readOnly = true)
    public boolean isUserInRoom(@NonNull UUID roomId, @NonNull UUID userId) {
        return roomMemberRepository.existsByRoomIdAndUserId(roomId, userId);
    }

    @Transactional(readOnly = true)
    public Optional<Room> findById(@NonNull UUID roomId) {
        return roomRepository.findByIdAndIsDeletedFalse(roomId);
    }

    @Transactional(readOnly = true)
    public Room getRoomDetails(@NonNull UUID roomId, @NonNull UUID userId) {
        Room room = roomRepository.findByIdAndIsDeletedFalse(roomId)
                .orElseThrow(() -> new RoomNotFoundException("Room not found: " + roomId));

        if (room.getType() != Room.RoomType.PUBLIC && room.getType() != Room.RoomType.RANDOM) {
            if (!isUserInRoom(roomId, userId)) {
                throw new UnauthorizedException("You do not have permission to view this room");
            }
        }
        return room;
    }

    @Transactional(readOnly = true)
    public RoomDTO toDTO(@NonNull Room room) {
        // Re-fetch the room inside a transaction to safely access lazy collections
        Room managedRoom = roomRepository.findById(room.getId()).orElse(room);
        return RoomDTO.builder()
                .id(managedRoom.getId())
                .name(managedRoom.getName())
                .type(managedRoom.getType())
                .description(managedRoom.getDescription())
                .inviteCode(managedRoom.getInviteCode())
                .createdBy(managedRoom.getCreatedBy() != null ? managedRoom.getCreatedBy().getId() : null)
                .members(managedRoom.getMembers() == null ? List.of() :
                        managedRoom.getMembers().stream()
                                .filter(member -> member.getUser() != null)
                                .map(member -> userService.toDTO(member.getUser()))
                                .collect(Collectors.toList()))
                .lastMessage(managedRoom.getLastMessage())
                .lastMessageAt(managedRoom.getLastMessageAt())
                .memberCount(managedRoom.getMembers() == null ? 0L : (long) managedRoom.getMembers().size())
                .createdAt(managedRoom.getCreatedAt())
                .build();
    }
}
