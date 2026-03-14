package com.plura.plurabackend.usuario.favorite.repository;

import com.plura.plurabackend.usuario.favorite.model.ClientFavoriteProfessional;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ClientFavoriteProfessionalRepository
    extends JpaRepository<ClientFavoriteProfessional, Long>, ClientFavoriteProfessionalRepositoryCustom {

    @EntityGraph(attributePaths = {"professional", "professional.user", "professional.categories"})
    List<ClientFavoriteProfessional> findByClientUser_IdOrderByCreatedAtDesc(Long clientUserId);

    @Query(
        """
        SELECT favorite.professional.id
        FROM ClientFavoriteProfessional favorite
        WHERE favorite.clientUser.id = :clientUserId
        ORDER BY favorite.createdAt DESC
        """
    )
    List<Long> findProfessionalIdsByClientUser_IdOrderByCreatedAtDesc(@Param("clientUserId") Long clientUserId);

    Optional<ClientFavoriteProfessional> findByClientUser_IdAndProfessional_Id(
        Long clientUserId,
        Long professionalId
    );

    long deleteByClientUser_IdAndProfessional_Id(Long clientUserId, Long professionalId);
}
