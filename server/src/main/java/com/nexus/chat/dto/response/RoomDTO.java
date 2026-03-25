package com.nexus.chat.dto.response;

import com.nexus.chat.entity.Room.RoomType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomDTO {
    private UUID id;
    private String name;
    private RoomType type;
    private String description;
    private UUID createdBy;
    private String inviteCode;
    private List<UserDTO> members;
    private String lastMessage;
    private LocalDateTime lastMessageAt;
    private Long memberCount;
    private LocalDateTime createdAt;
}
