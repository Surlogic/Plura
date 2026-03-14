package com.plura.plurabackend.core.booking.policy.repository;

import com.plura.plurabackend.core.booking.policy.model.BookingPolicy;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingPolicyRepository extends JpaRepository<BookingPolicy, String> {
    Optional<BookingPolicy> findByProfessionalId(Long professionalId);
}
