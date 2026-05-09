package com.plura.plurabackend.core.common.util;

import java.text.Normalizer;
import java.util.Locale;
import java.util.function.Predicate;

/**
 * SlugUtils es un componente de dominio del modulo comun / utilidades.
 * Responsabilidad: encapsular comportamiento propio del modulo y mantenerlo fuera de controllers u otras capas.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: la responsabilidad indicada por su paquete y nombre.
 */
public final class SlugUtils {

    private SlugUtils() {}

    /**
     * Convierte datos internos al formato slug esperado por el consumidor.
     */
    public static String toSlug(String value) {
        if (value == null) {
            return "";
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
            .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        String slug = normalized
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9\\s-]", "")
            .trim()
            .replaceAll("\\s+", "-")
            .replaceAll("-+", "-")
            .replaceAll("^-+|-+$", "");
        return slug;
    }

    /**
     * Genera unique slug con formato estable para uso interno o externo.
     */
    public static String generateUniqueSlug(String value, Predicate<String> exists) {
        String base = toSlug(value);
        if (base == null || base.isBlank()) {
            base = "profesional";
        }
        String candidate = base;
        int suffix = 1;
        while (exists.test(candidate)) {
            suffix += 1;
            candidate = base + "-" + suffix;
        }
        return candidate;
    }
}
