package com.plura.plurabackend.core.professional;

import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * ProfessionalSearchIndexGateway es un contrato interno del modulo profesionales.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: profesionales, busqueda.
 */
public interface ProfessionalSearchIndexGateway {

    List<ProfessionalSearchIndexProfileView> findActiveProfilesByIds(Collection<Long> ids);

    List<ProfessionalSearchIndexProfileView> findActiveProfilesPage(int page, int size);

    Map<Long, List<String>> findActiveServiceNamesByProfessionalIds(Collection<Long> ids);
}
