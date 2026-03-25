package com.nexus.chat.config;

import com.nexus.chat.entity.User;
import com.nexus.chat.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import org.springframework.security.crypto.password.PasswordEncoder;

@Component
@RequiredArgsConstructor
@Slf4j
public class DevUserInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        userRepository.findByUsername("devUser").ifPresentOrElse(devUser -> {
            // Force update password to dev123 (6 chars required)
            devUser.setPassword(passwordEncoder.encode("dev123"));
            userRepository.save(devUser);
        }, () -> {
            log.info("Initializing dev mode user: devUser");
            User devUser = User.builder()
                    .username("devUser")
                    .password(passwordEncoder.encode("dev123"))
                    .email("dev@nexus.chat")
                    .isOnline(true)
                    .build();
            userRepository.save(devUser);
        });
    }
}
