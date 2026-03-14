package com.plura.plurabackend.core.user.repository;

import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailAndDeletedAtIsNull(String email);

    Optional<User> findByProviderAndProviderIdAndDeletedAtIsNull(String provider, String providerId);

    Optional<User> findByIdAndDeletedAtIsNull(Long id);

    long countByRoleAndDeletedAtIsNull(UserRole role);

    default Optional<User> findByEmail(String email) {
        return findByEmailAndDeletedAtIsNull(email);
    }

    default Optional<User> findByProviderAndProviderId(String provider, String providerId) {
        return findByProviderAndProviderIdAndDeletedAtIsNull(provider, providerId);
    }

    default long countByRole(UserRole role) {
        return countByRoleAndDeletedAtIsNull(role);
    }
}
