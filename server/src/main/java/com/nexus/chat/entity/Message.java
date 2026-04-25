package com.nexus.chat.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "messages", indexes = {
    @Index(name = "idx_message_room_created", columnList = "room_id, created_at"),
    @Index(name = "idx_message_sender", columnList = "sender_id"),
    @Index(name = "idx_message_created_at", columnList = "created_at"),
    @Index(name = "idx_message_sender_created", columnList = "sender_id, created_at DESC"),
    @Index(name = "idx_message_room_not_deleted", columnList = "room_id, is_deleted, created_at DESC")
})
@Getter
@Setter
@ToString(exclude = {"sender", "room"})
@EqualsAndHashCode(exclude = {"sender", "room"})
@NoArgsConstructor
@AllArgsConstructor
@Builder

public class Message {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;
    
    @Column(name = "text", nullable = false, columnDefinition = "TEXT")
    private String text;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    @Builder.Default
    private MessageType type = MessageType.TEXT;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    @JsonIgnore
    private User sender;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    @JsonIgnore
    private Room room;
    
    @Column(name = "is_edited")
    @Builder.Default
    private boolean isEdited = false;
    
    @Column(name = "is_deleted")
    @Builder.Default
    private boolean isDeleted = false;
    
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    public enum MessageType {
        TEXT,
        SYSTEM,
        IMAGE,
        FILE
    }
}
