package com.nexus.chat.dto.request;

import com.nexus.chat.entity.Message.MessageType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SendMessageRequest {
    @NotBlank(message = "Message text is required")
    @Size(max = 5000, message = "Message cannot exceed 5000 characters")
    private String text;
    
    @NotNull(message = "Room ID is required")
    private UUID roomId;
    
    private MessageType type = MessageType.TEXT;
}
