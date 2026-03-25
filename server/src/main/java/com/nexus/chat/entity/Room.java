package com.nexus.chat.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "rooms", indexes = {
    @Index(name = "idx_room_type", columnList = "type"),
    @Index(name = "idx_room_created_by", columnList = "created_by"),
    @Index(name = "idx_room_created_at", columnList = "created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder

public class Room {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;
    
    @Column(name = "name", nullable = false)
    private String name;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private RoomType type;
    
    @Column(name = "description")
    private String description;

    @Column(name = "invite_code", unique = true)
    private String inviteCode;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;
    
    @OneToMany(mappedBy = "room", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private Set<RoomMember> members = new HashSet<>();
    
    @Column(name = "last_message")
    private String lastMessage;
    
    @Column(name = "last_message_at")
    private LocalDateTime lastMessageAt;
    
    // Soft delete fields
    @Column(name = "is_deleted")
    @Builder.Default
    private boolean isDeleted = false;
    
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
    
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
    
    public enum RoomType {
        DIRECT,
        PRIVATE_GROUP,
        PUBLIC,
        RANDOM
    }
}
