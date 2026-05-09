package com.plura.plurabackend.professional.plan;

import java.util.function.ToIntFunction;

/**
 * LimitCapability es un enum de dominio del modulo profesionales / planes.
 * Responsabilidad: limitar valores validos para estados, tipos o capacidades usados por el backend.
 * Colabora con: label, extractor.
 * Foco funcional: la responsabilidad indicada por su paquete y nombre.
 */
public enum LimitCapability {
    MAX_PROFESSIONALS(
        "profesionales activos",
        ProfessionalPlanEntitlements::maxProfessionals
    ),
    MAX_LOCATIONS(
        "locales",
        ProfessionalPlanEntitlements::maxLocations
    ),
    MAX_BUSINESS_PHOTOS(
        "fotos del negocio",
        ProfessionalPlanEntitlements::maxBusinessPhotos
    ),
    MAX_SERVICE_IMAGES_PER_SERVICE(
        "imágenes por servicio",
        ProfessionalPlanEntitlements::maxServiceImagesPerService
    ),
    MAX_SERVICES(
        "servicios",
        ProfessionalPlanEntitlements::maxServices
    );

    private final String label;
    private final ToIntFunction<ProfessionalPlanEntitlements> extractor;

    LimitCapability(String label, ToIntFunction<ProfessionalPlanEntitlements> extractor) {
        this.label = label;
        this.extractor = extractor;
    }

    /**
     * Resuelve limit normalizando entradas, defaults y casos borde.
     */
    public int resolveLimit(ProfessionalPlanEntitlements entitlements) {
        return entitlements == null ? 0 : extractor.applyAsInt(entitlements);
    }

    /**
     * Ejecuta la logica de exceeded message manteniendola encapsulada en este componente.
     */
    public String exceededMessage(int limit) {
        return "Tu plan permite hasta " + limit + " " + label;
    }
}
