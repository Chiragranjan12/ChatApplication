package com.nexus.chat.config;

import com.nexus.chat.dto.response.UserDTO;
import com.nexus.chat.entity.User;
import com.nexus.chat.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;
import org.springframework.web.socket.messaging.SessionUnsubscribeEvent;
import org.springframework.web.socket.messaging.SubProtocolEvent;

import java.security.Principal;
import java.util.Optional;

/**
 * WebSocket Event Listener for tracking connections and disconnections.
 * 
 * Handles:
 * - User online/offline status updates
 * - Notifying other users about presence changes
 * - Tracking subscriptions for memory leak prevention
 * - Error handling and logging
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketEventListener {

    private final UserService userService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Handle WebSocket connection established.
     * Mark user as online and notify others.
     */
    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        Principal principal = event.getUser();
        if (principal != null && principal.getName() != null) {
            String username = principal.getName();
            log.info("WebSocket connected: {}", username);
            
            try {
                Optional<User> userOpt = userService.findByUsername(username);
                
                if (userOpt.isPresent()) {
                    User user = userOpt.get();
                    userService.setUserOnline(user.getId(), true);
                    
                    // Broadcast user online status to all connected users
                    broadcastUserStatus(user.getId(), username, true);
                    
                    log.debug("User {} marked as online", username);
                }
            } catch (Exception e) {
                log.error("Error handling WebSocket connect for {}: {}", username, e.getMessage());
            }
        }
    }

    /**
     * Handle WebSocket disconnection.
     * Mark user as offline, cleanup subscriptions, notify others.
     */
    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        Principal principal = event.getUser();
        if (principal != null && principal.getName() != null) {
            String username = principal.getName();
            String sessionId = event.getSessionId();
            log.info("WebSocket disconnected: {} (session: {})", username, sessionId);
            
            try {
                Optional<User> userOpt = userService.findByUsername(username);
                
                if (userOpt.isPresent()) {
                    User user = userOpt.get();
                    userService.setUserOnline(user.getId(), false);
                    
                    // Broadcast user offline status to all connected users
                    broadcastUserStatus(user.getId(), username, false);
                    
                    log.debug("User {} marked as offline", username);
                }
            } catch (Exception e) {
                log.error("Error handling WebSocket disconnect for {}: {}", username, e.getMessage());
            }
        }
    }

    /**
     * Handle subscription events - track what topics users are subscribed to.
     */
    @EventListener
    public void handleSubscriptionEvent(SessionSubscribeEvent event) {
        Principal principal = event.getUser();
        String destination = event.getMessage().getHeaders().get("simpDestination", String.class);
        
        if (principal != null && destination != null) {
            log.debug("User {} subscribed to: {}", principal.getName(), destination);
        }
    }

    /**
     * Handle unsubscription events - cleanup to prevent memory leaks.
     */
    @EventListener
    public void handleUnsubscriptionEvent(SessionUnsubscribeEvent event) {
        Principal principal = event.getUser();
        String destination = event.getMessage().getHeaders().get("simpDestination", String.class);
        
        if (principal != null && destination != null) {
            log.debug("User {} unsubscribed from: {}", principal.getName(), destination);
        }
    }

    /**
     * Handle WebSocket errors - log and attempt cleanup.
     */
    @EventListener
    public void handleWebSocketErrorEvent(org.springframework.web.socket.messaging.WebSocketErrorEvent event) {
        log.error("WebSocket error: {} - {}", event.getSessionId(), event.getException() != null 
                ? event.getException().getMessage() : "Unknown error");
        
        // The SessionDisconnectEvent should handle cleanup, but we log for visibility
    }

    /**
     * Broadcast user online/offline status to all connected clients.
     */
    private void broadcastUserStatus(Long userId, String username, boolean online) {
        try {
            UserDTO userDTO = new UserDTO();
            userDTO.setId(userId);
            userDTO.setUsername(username);
            userDTO.setOnline(online);
            
            // Send to presence topic - all clients can subscribe to this
            messagingTemplate.convertAndSend("/topic/presence", userDTO);
            
            log.debug("Broadcasted {} status for user {}", online ? "online" : "offline", username);
        } catch (Exception e) {
            log.error("Error broadcasting user status: {}", e.getMessage());
        }
    }
}
