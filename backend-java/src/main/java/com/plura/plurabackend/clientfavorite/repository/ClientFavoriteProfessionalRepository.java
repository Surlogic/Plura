package com.plura.plurabackend.clientfavorite.repository;

import com.plura.plurabackend.clientfavorite.model.ClientFavoriteProfessional;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClientFavoriteProfessionalRepository
    extends JpaRepository<ClientFavoriteProfessional, Long> {

    @EntityGraph(attributePaths = {"professional", "professional.user", "professional.categories"})
    List<ClientFavoriteProfessional> findByClientUser_IdOrderByCreatedAtDesc(Long clientUserId);

    Optional<ClientFavoriteProfessional> findByClientUser_IdAndProfessional_Id(
        Long clientUserId,
        Long professionalId
    );

    long deleteByClientUser_IdAndProfessional_Id(Long clientUserId, Long professionalId);
}
