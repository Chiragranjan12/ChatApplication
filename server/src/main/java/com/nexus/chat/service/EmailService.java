package com.nexus.chat.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendOtpEmail(String toEmail, String otp) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject("Nexus Chat — Verify Your Email");
            message.setText(
                "Welcome to Nexus Chat!\n\n" +
                "Your verification code is:\n\n" +
                "  " + otp + "\n\n" +
                "This code expires in 5 minutes.\n\n" +
                "If you didn't create an account, you can safely ignore this email."
            );
            mailSender.send(message);
            log.info("[Email] OTP sent to {}", toEmail);
        } catch (Exception e) {
            log.error("[Email] Failed to send OTP to {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Failed to send OTP email. Please try again.");
        }
    }
}
