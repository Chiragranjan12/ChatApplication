package com.nexus.chat.service;

import com.nexus.chat.dto.response.MessageDTO;
import com.nexus.chat.entity.Message;
import com.nexus.chat.entity.Message.MessageType;
import com.nexus.chat.entity.Room;
import com.nexus.chat.entity.User;
import com.nexus.chat.exception.MessageNotFoundException;
import com.nexus.chat.exception.RoomNotFoundException;
import com.nexus.chat.exception.UnauthorizedException;
import com.nexus.chat.exception.UserNotFoundException;
import com.nexus.chat.repository.MessageRepository;
import com.nexus.chat.repository.RoomMemberRepository;
import com.nexus.chat.repository.RoomRepository;
import com.nexus.chat.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@SuppressWarnings("nullness")
public class MessageService {

    private final MessageRepository messageRepository;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final RoomMemberRepository roomMemberRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public Message sendMessage(@NonNull com.nexus.chat.dto.request.SendMessageRequest request, @NonNull String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new com.nexus.chat.exception.UserNotFoundException("User not found: " + username));
        return sendMessage(request.getRoomId(), user.getId(), request.getText(), request.getType());
    }

    @Transactional
    public Message sendMessage(@NonNull UUID roomId, @NonNull UUID senderId, @NonNull String text,
            @NonNull MessageType type) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RoomNotFoundException("Room not found with id: " + roomId));

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new UserNotFoundException("User not found with id: " + senderId));

        if (!roomMemberRepository.existsByRoomIdAndUserId(roomId, senderId)) {
            throw new UnauthorizedException("User is not a member of the room");
        }

        // Basic profanity filter
        String filteredText = filterProfanity(text);

        Message message = Message.builder()
                .text(filteredText)
                .type(type)
                .sender(sender)
                .room(room)
                .isEdited(false)
                .isDeleted(false)
                .build();

        message = messageRepository.save(message);

        // Update room's last message
        room.setLastMessage(filteredText.length() > 50 ? filteredText.substring(0, 50) + "..." : filteredText);
        room.setLastMessageAt(LocalDateTime.now());
        roomRepository.save(room);

        MessageDTO messageDTO = toDTO(message);
        messagingTemplate.convertAndSend("/topic/room/" + roomId, messageDTO);

        return message;
    }

    @Transactional(readOnly = true)
    public List<MessageDTO> getRoomMessages(@NonNull UUID roomId, int page, int size) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RoomNotFoundException("Room not found with id: " + roomId));

        Pageable pageable = PageRequest.of(page, size);
        Page<Message> messages = messageRepository.findByRoomOrderByCreatedAtDesc(room, pageable);

        return messages.getContent().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MessageDTO> getRecentMessages(@NonNull UUID roomId, @NonNull LocalDateTime since) {
        return messageRepository.findRecentMessagesByRoomId(roomId, since).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public Message editMessage(@NonNull UUID messageId, @NonNull UUID userId, @NonNull String newText) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new MessageNotFoundException("Message not found with id: " + messageId));

        if (!message.getSender().getId().equals(userId)) {
            throw new UnauthorizedException("Cannot edit message from another user");
        }

        String filteredText = filterProfanity(newText);
        message.setText(filteredText);
        message.setEdited(true);
        Message savedMessage = messageRepository.save(message);

        MessageDTO messageDTO = toDTO(savedMessage);
        messagingTemplate.convertAndSend("/topic/room/" + message.getRoom().getId(),
                java.util.Map.of("type", "MESSAGE_EDITED", "message", messageDTO));

        return savedMessage;
    }

    @Transactional
    public UUID deleteMessage(@NonNull UUID messageId, @NonNull UUID userId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new MessageNotFoundException("Message not found with id: " + messageId));

        if (!message.getSender().getId().equals(userId)) {
            throw new UnauthorizedException("Cannot delete message from another user");
        }

        UUID roomId = message.getRoom().getId();

        message.setDeleted(true);
        message.setText("[Message deleted]");
        messageRepository.save(message);

        messagingTemplate.convertAndSend("/topic/room/" + roomId,
                java.util.Map.of("type", "MESSAGE_DELETED", "messageId", messageId.toString()));

        return roomId;
    }

    private String filterProfanity(String text) {
        // Improved profanity filter
        String[] bannedWords = {
                "spam", "abuse", "hate", "toxic", "idiot", "stupid",
                "dumb", "kill", "die", "suicide"
        };
        String filtered = text;
        for (String word : bannedWords) {
            // Case-insensitive replacement with word boundaries
            filtered = filtered.replaceAll("(?i)\\b" + word + "\\b", "***");
        }
        return filtered;
    }

    public void broadcastTypingEvent(@NonNull String roomId, @NonNull String username, boolean isTyping) {
        try {
            messagingTemplate.convertAndSend("/topic/room/" + roomId,
                java.util.Map.of(
                    "type", "TYPING",
                    "roomId", roomId,
                    "username", username,
                    "isTyping", isTyping
                )
            );
        } catch (Exception e) {
            // Log if necessary
        }
    }

    public MessageDTO toDTO(@NonNull Message message) {
        return MessageDTO.builder()
                .id(message.getId())
                .text(message.getText())
                .type(message.getType())
                .senderId(message.getSender().getId())
                .senderUsername(message.getSender().getUsername())
                .senderAvatarUrl(message.getSender().getAvatarUrl())
                .roomId(message.getRoom().getId())
                .isEdited(message.isEdited())
                .isDeleted(message.isDeleted())
                .createdAt(message.getCreatedAt())
                .updatedAt(message.getUpdatedAt())
                .build();
    }
}
