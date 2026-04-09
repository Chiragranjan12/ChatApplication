package com.nexus.chat.controller;

import com.nexus.chat.dto.response.AuthResponse;
import com.nexus.chat.dto.request.LoginRequest;
import com.nexus.chat.dto.request.RegisterRequest;
import com.nexus.chat.entity.User;
import com.nexus.chat.security.CustomUserDetailsService;
import com.nexus.chat.service.UserService;
import com.nexus.chat.util.JwtUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@SuppressWarnings("nullness")
// REMOVED: @CrossOrigin(origins = "*") - Managed centrally in SecurityConfig
public class AuthController {

        private final AuthenticationManager authenticationManager;
        private final UserService userService;
        private final CustomUserDetailsService userDetailsService;
        private final JwtUtil jwtUtil;

        @PostMapping("/register")
        public ResponseEntity<?> register(@Valid @NonNull @RequestBody RegisterRequest request) {
                if (request.getEmail() == null || request.getEmail().isBlank()) {
                        return ResponseEntity.badRequest().body(Map.of("error", "Email is required for registration."));
                }

                User user = userService.createUser(
                                request.getUsername(),
                                request.getPassword(),
                                request.getEmail());

                // Trigger OTP email bypass
                // userService.generateAndSendOtp(user);

                UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
                String token = jwtUtil.generateToken(userDetails);
                userService.setUserOnline(user.getId(), true);

                return ResponseEntity.status(HttpStatus.CREATED).body(AuthResponse.builder()
                                .token(token)
                                .user(userService.toDTO(user))
                                .build());
        }

        @PostMapping("/verify-otp")
        public ResponseEntity<?> verifyOtp(@NonNull @RequestBody Map<String, String> request) {
                String email = request.get("email");
                String otp = request.get("otp");

                if (email == null || otp == null) {
                        return ResponseEntity.badRequest().body(Map.of("error", "Email and OTP are required."));
                }

                try {
                        User user = userService.verifyOtp(email, otp);

                        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());
                        String token = jwtUtil.generateToken(userDetails);

                        return ResponseEntity.ok(AuthResponse.builder()
                                        .token(token)
                                        .user(userService.toDTO(user))
                                        .build());
                } catch (RuntimeException e) {
                        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
                }
        }

        @PostMapping("/resend-otp")
        public ResponseEntity<?> resendOtp(@NonNull @RequestBody Map<String, String> request) {
                String email = request.get("email");
                if (email == null) {
                        return ResponseEntity.badRequest().body(Map.of("error", "Email is required."));
                }

                return userService.findByEmail(email)
                        .map(user -> {
                                if (user.isEmailVerified()) {
                                        return ResponseEntity.badRequest()
                                                .body(Map.of("error", "Email is already verified."));
                                }
                                userService.generateAndSendOtp(user);
                                return ResponseEntity.ok(Map.of("message", "OTP resent to " + email));
                        })
                        .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found.")));
        }

        @PostMapping("/login")
        public ResponseEntity<?> login(@Valid @NonNull @RequestBody LoginRequest request) {
                authenticationManager.authenticate(
                                new UsernamePasswordAuthenticationToken(
                                                request.getUsername(),
                                                request.getPassword()));

                User user = userService.findByUsername(request.getUsername())
                                .orElseThrow(() -> new RuntimeException("User not found"));

                // Block login if email is not verified
                if (!user.isEmailVerified()) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                                Map.of("error", "Email not verified. Please check your email for the OTP.",
                                       "email", user.getEmail() != null ? user.getEmail() : "")
                        );
                }

                UserDetails userDetails = userDetailsService.loadUserByUsername(request.getUsername());
                String token = jwtUtil.generateToken(userDetails);

                userService.setUserOnline(user.getId(), true);

                return ResponseEntity.ok(AuthResponse.builder()
                                .token(token)
                                .user(userService.toDTO(user))
                                .build());
        }

        @GetMapping("/oauth2/success")
        public ResponseEntity<Map<String, String>> oauth2Success() {
                return ResponseEntity.ok(Map.of("message", "OAuth2 login successful"));
        }

        @GetMapping("/oauth2/failure")
        public ResponseEntity<Map<String, String>> oauth2Failure() {
                return ResponseEntity.badRequest().body(Map.of("message", "OAuth2 login failed"));
        }

        @PostMapping("/logout")
        public ResponseEntity<Map<String, String>> logout(@NonNull Authentication authentication) {
                // FIXED: Set user offline when they logout
                userService.findByUsername(authentication.getName())
                                .ifPresent(user -> userService.setUserOnline(user.getId(), false));

                return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
        }
}
