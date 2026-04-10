package com.nexus.chat.controller;

import com.nexus.chat.dto.response.UserDTO;
import com.nexus.chat.service.UserService;
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
@RequestMapping("/api/users")
@RequiredArgsConstructor
@SuppressWarnings("nullness")
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    @Transactional(readOnly = true)
    public ResponseEntity<UserDTO> getCurrentUser(@NonNull Authentication authentication) {
        return userService.findByUsername(authentication.getName())
                .map(user -> ResponseEntity.ok(userService.toDTO(user)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<UserDTO> getUserById(@NonNull @PathVariable UUID id) {
        return userService.findById(id)
                .map(user -> ResponseEntity.ok(userService.toDTO(user)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/online")
    @Transactional(readOnly = true)
    public ResponseEntity<List<UserDTO>> getOnlineUsers() {
        return ResponseEntity.ok(userService.getOnlineUsers());
    }

    @PutMapping("/me/online")
    @Transactional
    public ResponseEntity<Map<String, Boolean>> setOnlineStatus(
            @NonNull @RequestBody Map<String, Boolean> status,
            @NonNull Authentication authentication) {
        return userService.findByUsername(authentication.getName())
                .map(user -> {
                    boolean isOnline = status.getOrDefault("online", false);
                    userService.setUserOnline(user.getId(), isOnline);

                    return ResponseEntity.ok(Map.of("online", isOnline));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/me")
    @Transactional
    public ResponseEntity<UserDTO> updateProfile(
            @RequestBody Map<String, String> body,
            @NonNull Authentication authentication) {
        return userService.findByUsername(authentication.getName())
                .map(user -> {
                    if (body.containsKey("username")) {
                        user.setUsername(body.get("username"));
                    }
                    if (body.containsKey("avatarUrl")) {
                        user.setAvatarUrl(body.get("avatarUrl"));
                    }
                    // userRepository implicitly saves if transactional, but we can do it explicitly
                    // Wait, we don't have userRepository here so let the transactional context persist properties.
                    return ResponseEntity.ok(userService.toDTO(user));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
