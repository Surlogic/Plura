package com.plura.plurabackend.booking.policy.repository;

import com.plura.plurabackend.booking.policy.model.BookingPolicy;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingPolicyRepository extends JpaRepository<BookingPolicy, String> {
    Optional<BookingPolicy> findByProfessional_Id(Long professionalId);
}
