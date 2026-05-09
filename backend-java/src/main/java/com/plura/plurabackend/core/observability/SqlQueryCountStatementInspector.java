package com.plura.plurabackend.core.observability;

import org.hibernate.resource.jdbc.spi.StatementInspector;

/**
 * SqlQueryCountStatementInspector es un componente de dominio del modulo observabilidad.
 * Responsabilidad: encapsular comportamiento propio del modulo y mantenerlo fuera de controllers u otras capas.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: la responsabilidad indicada por su paquete y nombre.
 */
public class SqlQueryCountStatementInspector implements StatementInspector {

    /**
     * Ejecuta la logica de inspect manteniendola encapsulada en este componente.
     */
    @Override
    public String inspect(String sql) {
        if (sql != null && !sql.isBlank()) {
            RequestSqlQueryCount.increment();
        }
        return sql;
    }
}
