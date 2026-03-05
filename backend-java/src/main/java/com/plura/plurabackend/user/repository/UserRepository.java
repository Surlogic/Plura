package com.plura.plurabackend.user.repository;

import com.plura.plurabackend.user.model.User;
import com.plura.plurabackend.user.model.UserRole;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    Optional<User> findByProviderAndProviderId(String provider, String providerId);

    long countByRole(UserRole role);
}
