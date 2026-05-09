package com.plura.plurabackend.usuario.favorite.repository;

import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.usuario.favorite.model.ClientFavoriteProfessional;

/**
 * ClientFavoriteProfessionalRepositoryCustom es un contrato interno del modulo cliente / favoritos / persistencia.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Persistencia: concentra queries derivadas o JPQL para que los servicios no conozcan SQL/joins.
 * Foco funcional: profesionales, favoritos, clientes.
 */
public interface ClientFavoriteProfessionalRepositoryCustom {

    ClientFavoriteProfessional saveReference(User clientUser, Long professionalId);
}
