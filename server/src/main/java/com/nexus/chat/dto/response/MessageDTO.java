package com.nexus.chat.dto.response;

import com.nexus.chat.entity.Message.MessageType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageDTO {
    private UUID id;
    private String text;
    private MessageType type;
    private UUID senderId;
    private String senderUsername;
    private String senderAvatarUrl;
    private UUID roomId;
    @Builder.Default
    private boolean isEdited = false;
    @Builder.Default
    private boolean isDeleted = false;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
