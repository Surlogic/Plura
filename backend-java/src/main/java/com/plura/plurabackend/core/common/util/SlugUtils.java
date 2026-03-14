package com.plura.plurabackend.core.common.util;

import java.text.Normalizer;
import java.util.Locale;
import java.util.function.Predicate;

public final class SlugUtils {

    private SlugUtils() {}

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
