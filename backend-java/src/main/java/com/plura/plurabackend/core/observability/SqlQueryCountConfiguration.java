package com.plura.plurabackend.core.observability;

import java.io.IOException;
import java.util.Map;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.hibernate.cfg.AvailableSettings;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.orm.jpa.HibernatePropertiesCustomizer;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;

@Component
public class SqlQueryCountConfiguration implements HibernatePropertiesCustomizer {

    private final SqlQueryCountStatementInspector inspector = new SqlQueryCountStatementInspector();

    @Override
    public void customize(Map<String, Object> hibernateProperties) {
        hibernateProperties.put(AvailableSettings.STATEMENT_INSPECTOR, inspector);
    }

    @Component
    static class SqlQueryCountFilter extends OncePerRequestFilter {

        private final boolean headerEnabled;

        SqlQueryCountFilter(
            @Value("${app.observability.query-count-header-enabled:false}") boolean headerEnabled
        ) {
            this.headerEnabled = headerEnabled;
        }

        @Override
        protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
        ) throws ServletException, IOException {
            RequestSqlQueryCount.start();
            try {
                if (headerEnabled) {
                    ContentCachingResponseWrapper responseWrapper = new ContentCachingResponseWrapper(response);
                    filterChain.doFilter(request, responseWrapper);
                    responseWrapper.setHeader(
                        "X-Plura-Sql-Query-Count",
                        String.valueOf(RequestSqlQueryCount.current())
                    );
                    responseWrapper.copyBodyToResponse();
                } else {
                    filterChain.doFilter(request, response);
                }
            } finally {
                RequestSqlQueryCount.clear();
            }
        }
    }
}
