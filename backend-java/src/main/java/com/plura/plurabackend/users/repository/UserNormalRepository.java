package com.plura.plurabackend.users.repository;

import java.util.Optional;
import com.plura.plurabackend.users.model.UserNormal;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserNormalRepository extends JpaRepository<UserNormal, String> {
    Optional<UserNormal> findByEmail(String email);
}
