package com.plura.plurabackend.core.observability;

import org.hibernate.resource.jdbc.spi.StatementInspector;

public class SqlQueryCountStatementInspector implements StatementInspector {

    @Override
    public String inspect(String sql) {
        if (sql != null && !sql.isBlank()) {
            RequestSqlQueryCount.increment();
        }
        return sql;
    }
}
