package com.nexus.chat.controller;

import com.nexus.chat.dto.response.MessageDTO;
import com.nexus.chat.dto.request.SendMessageRequest;
import com.nexus.chat.entity.Message;
import com.nexus.chat.service.MessageService;
import com.nexus.chat.service.RoomService;
import com.nexus.chat.service.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
@SuppressWarnings({"null", "nullness"})
public class MessageController {

    private static final Logger log = LoggerFactory.getLogger(MessageController.class);

    private final MessageService messageService;
    private final UserService userService;
    private final RoomService roomService;

    @GetMapping("/room/{roomId}")
    @Transactional(readOnly = true)
    public ResponseEntity<List<MessageDTO>> getRoomMessages(
            @NonNull @PathVariable UUID roomId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "50") @Min(1) @Max(100) int size,
            @NonNull Authentication authentication) {

        return userService.findByUsername(authentication.getName())
                .map(user -> {
                    if (!roomService.isUserInRoom(roomId, user.getId())) {
                        return ResponseEntity.status(403).<List<MessageDTO>>build();
                    }
                    return ResponseEntity.ok(messageService.getRoomMessages(roomId, page, size));
                })
                .orElse(ResponseEntity.badRequest().build());
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<MessageDTO> editMessage(
            @NonNull @PathVariable UUID id,
            @NonNull @RequestBody Map<String, String> request,
            @NonNull Authentication authentication) {
        return userService.findByUsername(authentication.getName())
                .map(user -> {
                    Message message = messageService.editMessage(id, user.getId(), request.get("text"));
                    MessageDTO messageDTO = messageService.toDTO(message);
                    return ResponseEntity.ok(messageDTO);
                })
                .orElse(ResponseEntity.badRequest().build());
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Map<String, String>> deleteMessage(
            @NonNull @PathVariable UUID id,
            @NonNull Authentication authentication) {
        return userService.findByUsername(authentication.getName())
                .map(user -> {
                    messageService.deleteMessage(id, user.getId());
                    return ResponseEntity.ok(Map.of("message", "Message deleted successfully"));
                })
                .orElse(ResponseEntity.badRequest().build());
    }

    @MessageMapping("/chat.send")
    public void sendMessage(@Valid @NonNull @Payload SendMessageRequest request, Principal principal) {
        // Dev-mode fallback
        String username = (principal != null) ? principal.getName() : "devUser";

        try {
            messageService.sendMessage(request, username);
        } catch (com.nexus.chat.exception.UnauthorizedException e) {
            log.warn("Unauthorized WebSocket message attempt by '{}' to room {}", username, request.getRoomId());
        } catch (Exception e) {
            log.error("Failed to save/broadcast WebSocket message from '{}' to room {}: {}",
                    username, request.getRoomId(), e.getMessage());
        }
    }

    @MessageMapping("/chat.typing")
    public void sendTypingEvent(@Payload Map<String, String> request, Principal principal) {
        String username = (principal != null) ? principal.getName() : "devUser";
        String roomId = request.get("roomId");
        String isTyping = request.get("isTyping"); // "true" or "false"

        if (roomId == null) return;

        messageService.broadcastTypingEvent(roomId, username, "true".equalsIgnoreCase(isTyping));
    }
}
