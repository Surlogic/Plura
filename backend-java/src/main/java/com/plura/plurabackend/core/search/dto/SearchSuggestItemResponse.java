package com.plura.plurabackend.core.search.dto;

import lombok.Data;

/**
 * SearchSuggestItemResponse es un DTO de respuesta del modulo busqueda / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: busqueda.
 */
@Data
public class SearchSuggestItemResponse {
    private String id;
    private String name;
    private String displayName;
    private String professionalName;
    private String businessName;
    private String serviceName;

    public SearchSuggestItemResponse(
        String id,
        String name,
        String displayName,
        String professionalName,
        String businessName,
        String serviceName
    ) {
        this.id = id;
        this.name = name;
        this.displayName = displayName;
        this.professionalName = professionalName;
        this.businessName = businessName;
        this.serviceName = serviceName;
    }

    public SearchSuggestItemResponse(String id, String name) {
        this(id, name, name, null, null, null);
    }

    /**
     * Ejecuta la logica de profesional manteniendola encapsulada en este componente.
     */
    public static SearchSuggestItemResponse professional(String id, String professionalName) {
        return new SearchSuggestItemResponse(
            id,
            professionalName,
            professionalName,
            professionalName,
            null,
            null
        );
    }

    /**
     * Ejecuta la logica de local manteniendola encapsulada en este componente.
     */
    public static SearchSuggestItemResponse local(String id, String businessName) {
        return new SearchSuggestItemResponse(
            id,
            businessName,
            businessName,
            null,
            businessName,
            null
        );
    }

    /**
     * Ejecuta la logica de servicio manteniendola encapsulada en este componente.
     */
    public static SearchSuggestItemResponse service(String id, String serviceName) {
        return new SearchSuggestItemResponse(
            id,
            serviceName,
            serviceName,
            null,
            null,
            serviceName
        );
    }
}
