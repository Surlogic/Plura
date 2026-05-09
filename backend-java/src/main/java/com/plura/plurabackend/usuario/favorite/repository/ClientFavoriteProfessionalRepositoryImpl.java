package com.plura.plurabackend.usuario.favorite.repository;

import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.usuario.favorite.model.ClientFavoriteProfessional;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Repository;

/**
 * ClientFavoriteProfessionalRepositoryImpl es un componente de dominio del modulo cliente / favoritos / persistencia.
 * Responsabilidad: encapsular comportamiento propio del modulo y mantenerlo fuera de controllers u otras capas.
 * Persistencia: concentra queries derivadas o JPQL para que los servicios no conozcan SQL/joins.
 * Foco funcional: profesionales, favoritos, clientes.
 */
@Repository
public class ClientFavoriteProfessionalRepositoryImpl implements ClientFavoriteProfessionalRepositoryCustom {

    private final EntityManager entityManager;

    public ClientFavoriteProfessionalRepositoryImpl(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    /**
     * Ejecuta la logica de save reference manteniendola encapsulada en este componente.
     */
    @Override
    public ClientFavoriteProfessional saveReference(User clientUser, Long professionalId) {
        ClientFavoriteProfessional favorite = new ClientFavoriteProfessional();
        favorite.setClientUser(clientUser);
        favorite.setProfessional(entityManager.getReference(ProfessionalProfile.class, professionalId));
        entityManager.persist(favorite);
        return favorite;
    }
}
