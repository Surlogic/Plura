package com.plura.plurabackend.usuario.favorite.repository;

import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.usuario.favorite.model.ClientFavoriteProfessional;

public interface ClientFavoriteProfessionalRepositoryCustom {

    ClientFavoriteProfessional saveReference(User clientUser, Long professionalId);
}
