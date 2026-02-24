package com.plura.plurabackend.profesional.repository;

import com.plura.plurabackend.profesional.model.ProfesionalService;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfesionalServiceRepository extends JpaRepository<ProfesionalService, String> {
    List<ProfesionalService> findByProfesional_IdOrderByCreatedAtDesc(String profesionalId);
}
