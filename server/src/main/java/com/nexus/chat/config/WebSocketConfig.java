package com.nexus.chat.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.MessageHeaderAccessor;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import com.nexus.chat.util.JwtUtil;
import com.nexus.chat.security.CustomUserDetailsService;
import lombok.RequiredArgsConstructor;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArraySet;

/**
 * WebSocket Configuration for STOMP-based real-time messaging.
 * 
 * Features:
 * - STOMP over SockJS for cross-browser support
 * - JWT-based authentication on connect
 * - Simple in-memory message broker for /topic and /queue
 * - User-specific destinations via /user prefix
 * - Connection tracking and cleanup to prevent memory leaks
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
@Slf4j
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtUtil jwtUtil;
    private final CustomUserDetailsService userDetailsService;

    // Track active sessions to prevent memory leaks
    private final Set<String> activeSessions = new CopyOnWriteArraySet<>();
    private final Map<String, String> sessionToUserMap = new ConcurrentHashMap<>();

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable simple in-memory broker for pub/sub messaging
        // /topic - broadcast to all subscribers (e.g., /topic/room/{roomId})
        // /queue - point-to-point messages (e.g., /user/queue/messages)
        config.enableSimpleBroker("/topic", "/queue");
        
        // Prefix for application-handled destinations
        config.setApplicationDestinationPrefixes("/app");
        
        // Prefix for user-specific destinations (private messages)
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String frontendUrl = System.getenv("FRONTEND_URL");
        java.util.List<String> origins = new java.util.ArrayList<>();
        
        // Production: Railway frontend
        origins.add("https://chatapplication-production-145c.up.railway.app");
        
        // Additional origins from env var (if set)
        if (frontendUrl != null && !frontendUrl.isEmpty()) {
            java.util.Collections.addAll(origins, frontendUrl.split(","));
        }
        
        // Local development
        origins.add("http://localhost:5173");
        origins.add("http://localhost:3000");
        origins.add("http://localhost:8080");
        
        String[] allowedOrigins = origins.toArray(new String[0]);

        // Register STOMP endpoint with SockJS fallback
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(allowedOrigins)
                .addInterceptors(new JwtHandshakeInterceptor(jwtUtil, userDetailsService, sessionToUserMap, activeSessions))
                .withSockJS();
        
        // Also register plain WebSocket endpoint (no SockJS) for modern browsers
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(allowedOrigins)
                .addInterceptors(new JwtHandshakeInterceptor(jwtUtil, userDetailsService, sessionToUserMap, activeSessions));
        
        log.info("STOMP WebSocket endpoints registered at /ws with CORS origins: {}", 
                String.join(", ", allowedOrigins));
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                
                if (accessor != null) {
                    // Handle CONNECT - validate and authenticate
                    if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                        String sessionId = accessor.getSessionId();
                        log.debug("STOMP CONNECT received for session: {}", sessionId);
                        
                        String authHeader = accessor.getFirstNativeHeader("Authorization");
                        if (authHeader != null && authHeader.startsWith("Bearer ")) {
                            String token = authHeader.substring(7);
                            try {
                                String username = jwtUtil.extractUsername(token);
                                if (username != null && jwtUtil.validateToken(token, userDetailsService.loadUserByUsername(username))) {
                                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                                            userDetails, null, userDetails.getAuthorities());
                                    accessor.setUser(authentication);
                                    
                                    // Track session
                                    activeSessions.add(sessionId);
                                    sessionToUserMap.put(sessionId, username);
                                    
                                    log.info("User {} connected with session {}", username, sessionId);
                                }
                            } catch (Exception e) {
                                log.error("JWT validation failed during STOMP connect: {}", e.getMessage());
                            }
                        }
                    }
                    
                    // Handle DISCONNECT - cleanup
                    else if (StompCommand.DISCONNECT.equals(accessor.getCommand())) {
                        String sessionId = accessor.getSessionId();
                        String username = sessionToUserMap.remove(sessionId);
                        activeSessions.remove(sessionId);
                        
                        if (username != null) {
                            log.info("User {} disconnected, session: {}", username, sessionId);
                        }
                    }
                    
                    // Handle SUBSCRIBE - log subscription
                    else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
                        String destination = accessor.getDestination();
                        String sessionId = accessor.getSessionId();
                        log.debug("Session {} subscribed to: {}", sessionId, destination);
                    }
                    
                    // Handle UNSUBSCRIBE - log unsubscription
                    else if (StompCommand.UNSUBSCRIBE.equals(accessor.getCommand())) {
                        String destination = accessor.getDestination();
                        String sessionId = accessor.getSessionId();
                        log.debug("Session {} unsubscribed from: {}", sessionId, destination);
                    }
                    
                    // Handle MESSAGE (client sending message)
                    else if (StompCommand.SEND.equals(accessor.getCommand())) {
                        String destination = accessor.getDestination();
                        log.debug("Client sending to: {}", destination);
                    }
                }
                
                return message;
            }
        });
    }

    /**
     * Get count of active WebSocket sessions (for monitoring)
     */
    public int getActiveSessionCount() {
        return activeSessions.size();
    }

    /**
     * Get all active session IDs (for debugging)
     */
    public Set<String> getActiveSessions() {
        return new CopyOnWriteArraySet<>(activeSessions);
    }
}
