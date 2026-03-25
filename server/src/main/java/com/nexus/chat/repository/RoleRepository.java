package com.nexus.chat.repository;

import com.nexus.chat.entity.Role;
import com.nexus.chat.entity.Role.RoleName;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoleRepository extends JpaRepository<Role, UUID> {

    Optional<Role> findByName(@NonNull RoleName name);
}
