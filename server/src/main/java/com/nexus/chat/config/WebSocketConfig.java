package com.nexus.chat.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
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

        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(allowedOrigins)
                .withSockJS();
    }
}
