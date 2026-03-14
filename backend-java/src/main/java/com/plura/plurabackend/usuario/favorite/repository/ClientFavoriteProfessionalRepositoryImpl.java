package com.plura.plurabackend.usuario.favorite.repository;

import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.usuario.favorite.model.ClientFavoriteProfessional;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Repository;

@Repository
public class ClientFavoriteProfessionalRepositoryImpl implements ClientFavoriteProfessionalRepositoryCustom {

    private final EntityManager entityManager;

    public ClientFavoriteProfessionalRepositoryImpl(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Override
    public ClientFavoriteProfessional saveReference(User clientUser, Long professionalId) {
        ClientFavoriteProfessional favorite = new ClientFavoriteProfessional();
        favorite.setClientUser(clientUser);
        favorite.setProfessional(entityManager.getReference(ProfessionalProfile.class, professionalId));
        entityManager.persist(favorite);
        return favorite;
    }
}
