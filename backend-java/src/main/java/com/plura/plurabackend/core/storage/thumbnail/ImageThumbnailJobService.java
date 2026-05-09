package com.plura.plurabackend.core.storage.thumbnail;

/**
 * ImageThumbnailJobService es un contrato interno del modulo storage / miniaturas.
 * Responsabilidad: definir una frontera estable para que otros modulos no dependan de detalles concretos.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: servicios, imagenes.
 */
public interface ImageThumbnailJobService {
    void generateThumbnailsAsync(String objectKey);
}
