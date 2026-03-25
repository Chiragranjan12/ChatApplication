package com.nexus.chat.config;

import com.nexus.chat.dto.response.UserDTO;
import com.nexus.chat.entity.User;
import com.nexus.chat.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.context.event.EventListener;

import java.security.Principal;
import java.util.Map;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final UserService userService;

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        Principal principal = event.getUser();
        if (principal != null && principal.getName() != null) {
            String username = principal.getName();
            // Suppress null type warning by knowing getName is effectively non-null String here
            @SuppressWarnings("nullness")
            Optional<User> userOpt = userService.findByUsername(username);
            
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                userService.setUserOnline(user.getId(), true);
            }
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        Principal principal = event.getUser();
        if (principal != null && principal.getName() != null) {
            String username = principal.getName();
            @SuppressWarnings("nullness")
            Optional<User> userOpt = userService.findByUsername(username);
            
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                userService.setUserOnline(user.getId(), false);
            }
        }
    }
}
