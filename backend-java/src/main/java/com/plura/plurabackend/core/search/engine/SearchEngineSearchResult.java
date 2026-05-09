package com.plura.plurabackend.core.search.engine;

import java.util.List;

/**
 * SearchEngineSearchResult es un modelo inmutable del modulo busqueda / motor.
 * Responsabilidad: agrupar datos de lectura o respuesta con una estructura clara y sin estado mutable.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: busqueda.
 */
public record SearchEngineSearchResult(List<Long> orderedIds, long total) {}
