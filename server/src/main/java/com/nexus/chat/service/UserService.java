package com.nexus.chat.service;

import com.nexus.chat.dto.response.UserDTO;
import com.nexus.chat.entity.Role;
import com.nexus.chat.entity.User;
import com.nexus.chat.repository.RoleRepository;
import com.nexus.chat.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public User createUser(@NonNull String username,
            @NonNull String password,
            String email) {

        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("Username already exists");
        }

        if (email != null && userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email already exists");
        }

        // Find or create the ROLE_USER in database
        Role userRole = roleRepository.findByName(Role.RoleName.ROLE_USER)
                .orElseGet(() -> roleRepository.save(
                        Role.builder()
                                .name(Role.RoleName.ROLE_USER)
                                .build()));

        User user = User.builder()
                .username(username)
                .password(passwordEncoder.encode(password))
                .email(email)
                .avatarUrl("https://api.dicebear.com/7.x/avataaars/svg?seed=" + username)
                .isOnline(false)
                .emailVerified(true)
                .build();

        user.getRoles().add(userRole);
        return userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public Optional<User> findByUsername(@NonNull String username) {
        return userRepository.findByUsername(username);
    }

    @Transactional(readOnly = true)
    public Optional<User> findByEmail(@NonNull String email) {
        return userRepository.findByEmail(email);
    }

    @Transactional
    public void generateAndSendOtp(@NonNull User user) {
        String otp = String.valueOf(ThreadLocalRandom.current().nextInt(100000, 999999));
        user.setOtp(otp);
        user.setOtpExpiry(LocalDateTime.now().plusMinutes(5));
        user.setOtpAttempts(0); // Reset attempt counter on new OTP
        userRepository.save(user);

        if (user.getEmail() != null) {
            emailService.sendOtpEmail(user.getEmail(), otp);
        } else {
            throw new RuntimeException("Cannot send OTP: email address is missing.");
        }
    }

    @Transactional
    public User verifyOtp(@NonNull String email, @NonNull String otp) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Max 5 attempts security check
        if (user.getOtpAttempts() >= 5) {
            throw new RuntimeException("Too many failed attempts. Please request a new OTP.");
        }

        if (user.getOtpExpiry() == null || LocalDateTime.now().isAfter(user.getOtpExpiry())) {
            throw new RuntimeException("OTP has expired. Please request a new one.");
        }

        if (user.getOtp() == null || !user.getOtp().equals(otp)) {
            // Increment attempt count on wrong guess
            user.setOtpAttempts(user.getOtpAttempts() + 1);
            userRepository.save(user);
            int remaining = 5 - user.getOtpAttempts();
            throw new RuntimeException(remaining > 0
                ? "Invalid OTP. " + remaining + " attempt(s) remaining."
                : "Too many failed attempts. Please request a new OTP."
            );
        }

        user.setEmailVerified(true);
        user.setOtp(null);
        user.setOtpExpiry(null);
        user.setOtpAttempts(0);
        return userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public Optional<User> findById(@NonNull UUID id) {
        return userRepository.findById(id);
    }

    @Transactional
    public User createOrUpdateOAuthUser(@NonNull String provider,
            @NonNull String providerId,
            String email,
            @NonNull String username) {

        return userRepository.findByOauthProviderAndOauthProviderId(provider, providerId)
                .orElseGet(() -> {

                    // 1️⃣ Always resolve ROLE_USER safely
                    Role userRole = roleRepository.findByName(Role.RoleName.ROLE_USER)
                            .orElseGet(() -> roleRepository.save(
                                    Role.builder()
                                            .name(Role.RoleName.ROLE_USER)
                                            .build()));

                    // 2️⃣ Find or create user by username
                    User user = userRepository.findByUsername(username)
                            .orElseGet(() -> {
                                User newUser = User.builder()
                                        .username(username)
                                        .password(null) // OAuth users have no password
                                        .email(email)
                                        .avatarUrl("https://api.dicebear.com/7.x/avataaars/svg?seed=" + username)
                                        .isOnline(false)
                                        .oauthProvider(provider)
                                        .oauthProviderId(providerId)
                                        .build();

                                newUser.getRoles().add(userRole);
                                return userRepository.save(newUser);
                            });

                    // 3️⃣ Link OAuth info if missing
                    if (user.getOauthProvider() == null) {
                        user.setOauthProvider(provider);
                        user.setOauthProviderId(providerId);

                        // ⚠️ IMPORTANT: ensure role is present
                        user.getRoles().add(userRole);

                        return userRepository.save(user);
                    }

                    return user;
                });
    }

    @Transactional
    public void setUserOnline(@NonNull UUID userId, boolean online) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setIsOnline(online);
            userRepository.save(user);

            if (online) {
                messagingTemplate.convertAndSend("/topic/presence",
                        java.util.Map.of("type", "USER_JOINED", "user", toDTO(user)));
            } else {
                messagingTemplate.convertAndSend("/topic/presence",
                        java.util.Map.of("type", "USER_LEFT", "userId", user.getId().toString()));
            }
        });
    }

    @Transactional(readOnly = true)
    public List<UserDTO> getOnlineUsers() {
        return userRepository.findAll() // Faking it for now as requested
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public UserDTO toDTO(@NonNull User user) {
        return UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .avatarUrl(user.getAvatarUrl())
                .isOnline(user.getIsOnline())
                .build();
    }
}
