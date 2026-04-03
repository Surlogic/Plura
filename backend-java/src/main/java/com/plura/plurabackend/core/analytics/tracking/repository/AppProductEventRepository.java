package com.plura.plurabackend.core.analytics.tracking.repository;

import com.plura.plurabackend.core.analytics.tracking.model.AppProductEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppProductEventRepository extends JpaRepository<AppProductEvent, Long> {
}
