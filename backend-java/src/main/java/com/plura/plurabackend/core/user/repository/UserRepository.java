package com.plura.plurabackend.core.user.repository;

import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * UserRepository es un contrato interno del modulo usuarios / persistencia.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Persistencia: concentra queries derivadas o JPQL para que los servicios no conozcan SQL/joins.
 * Foco funcional: usuarios.
 */
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailAndDeletedAtIsNull(String email);

    Optional<User> findByProviderAndProviderIdAndDeletedAtIsNull(String provider, String providerId);

    Optional<User> findByIdAndDeletedAtIsNull(Long id);

    boolean existsByPhoneNumberAndDeletedAtIsNull(String phoneNumber);

    Optional<User> findFirstByPhoneNumberAndClientActiveTrueAndDeletedAtIsNull(String phoneNumber);

    Optional<User> findFirstByPhoneNumberAndPhoneVerifiedAtIsNotNullAndDeletedAtIsNull(String phoneNumber);

    Optional<User> findFirstByPhoneNumberAndDeletedAtIsNull(String phoneNumber);

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
