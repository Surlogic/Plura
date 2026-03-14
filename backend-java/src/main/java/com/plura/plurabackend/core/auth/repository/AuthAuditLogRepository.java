package com.plura.plurabackend.core.auth.repository;

import com.plura.plurabackend.core.auth.model.AuthAuditLog;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthAuditLogRepository extends JpaRepository<AuthAuditLog, Long> {

    List<AuthAuditLog> findTop50ByUserIdOrderByCreatedAtDesc(Long userId);
}
