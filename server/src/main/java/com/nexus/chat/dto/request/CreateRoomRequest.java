package com.nexus.chat.dto.request;

import com.nexus.chat.entity.Room.RoomType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateRoomRequest {
    @NotBlank(message = "Room name is required")
    private String name;
    
    @NotNull(message = "Room type is required")
    private RoomType type;
    
    private String description;
}
