package com.nexus.chat.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDTO {
    private UUID id;
    private String username;
    private String email;
    private String avatarUrl;

    // Ensures JSON key is "online" regardless of Lombok getter naming (isOnline vs online)
    @JsonProperty("online")
    private Boolean isOnline;
}
