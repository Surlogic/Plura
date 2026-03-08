package com.plura.plurabackend.auth.repository;

import com.plura.plurabackend.auth.model.AuthAuditLog;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthAuditLogRepository extends JpaRepository<AuthAuditLog, Long> {

    List<AuthAuditLog> findTop50ByUserIdOrderByCreatedAtDesc(Long userId);
}
