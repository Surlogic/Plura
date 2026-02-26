package com.plura.plurabackend.auth.repository;

import com.plura.plurabackend.auth.model.RefreshToken;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, String> {
    Optional<RefreshToken> findByTokenAndRevokedAtIsNull(String token);

    Optional<RefreshToken> findByToken(String token);
}
