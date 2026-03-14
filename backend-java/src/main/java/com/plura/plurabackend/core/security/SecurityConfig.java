package com.plura.plurabackend.core.security;

import com.plura.plurabackend.core.security.jwt.JwtAuthenticationFilter;
import com.plura.plurabackend.config.ratelimit.RateLimitingFilter;
import java.util.Arrays;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.security.web.header.writers.StaticHeadersWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private static final Logger LOGGER = LoggerFactory.getLogger(SecurityConfig.class);

    @Bean
    public SecurityFilterChain securityFilterChain(
        HttpSecurity http,
        JwtAuthenticationFilter jwtFilter,
        RateLimitingFilter rateLimitingFilter,
        CookieOriginProtectionFilter cookieOriginProtectionFilter,
        InternalOpsActuatorAccessFilter internalOpsActuatorAccessFilter
    ) throws Exception {
        http
            // API stateless con Bearer token: no sesiones y sin CSRF stateful.
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .httpBasic(AbstractHttpConfigurer::disable)
            .formLogin(AbstractHttpConfigurer::disable)
            .logout(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .headers(headers -> headers
                .contentTypeOptions(Customizer.withDefaults())
                .frameOptions(frame -> frame.sameOrigin())
                .referrerPolicy(referrer -> referrer
                    .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)
                )
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .preload(true)
                    .maxAgeInSeconds(31536000)
                )
                .addHeaderWriter(new StaticHeadersWriter("Permissions-Policy", "geolocation=(), microphone=(), camera=()"))
            )
            .authorizeHttpRequests(auth -> auth
                // Permite preflight CORS.
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/auth/oauth").permitAll()
                // Endpoints públicos de autenticación.
                .requestMatchers(
                    "/auth/login",
                    "/auth/login/**",
                    "/auth/register",
                    "/auth/register/**",
                    "/auth/password/forgot",
                    "/auth/password/reset",
                    "/auth/refresh",
                    "/auth/logout",
                    "/api/home",
                    "/api/search",
                    "/api/search/suggest",
                    "/api/geo/autocomplete",
                    "/api/geo/geocode",
                    "/api/geo/suggest",
                    "/categories",
                    "/api/categories",
                    "/health",
                    "/webhooks/mercadopago",
                    "/webhooks/dlocal",
                    "/uploads/**",
                    "/error"
                ).permitAll()
                .requestMatchers("/internal/ops/**").permitAll()
                .requestMatchers("/public/**").permitAll()
                .requestMatchers(HttpMethod.DELETE, "/auth/me").hasAnyRole("PROFESSIONAL", "USER")
                .requestMatchers(HttpMethod.POST, "/auth/password/change").hasAnyRole("PROFESSIONAL", "USER")
                .requestMatchers("/auth/challenge/**").hasAnyRole("PROFESSIONAL", "USER")
                .requestMatchers("/auth/verify/**").hasAnyRole("PROFESSIONAL", "USER")
                .requestMatchers("/auth/me/profesional", "/auth/me/professional").hasRole("PROFESSIONAL")
                .requestMatchers("/auth/me/cliente").hasRole("USER")
                .requestMatchers("/auth/sessions", "/auth/sessions/**", "/auth/logout-all", "/auth/audit").hasAnyRole("PROFESSIONAL", "USER")
                .requestMatchers("/profesional/**").hasRole("PROFESSIONAL")
                .requestMatchers("/billing/**").hasRole("PROFESSIONAL")
                .requestMatchers("/cliente/**").hasRole("USER")
                // Swagger: deshabilitado por defecto via springdoc.swagger-ui.enabled=false.
                // Si se habilita (SWAGGER_ENABLED=true), requiere autenticación.
                .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**").authenticated()
                // Todo lo demás requiere JWT válido.
                .anyRequest().authenticated()
            )
            // Respuesta 401 si no hay autenticación.
            .exceptionHandling(ex -> ex.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
            .addFilterBefore(internalOpsActuatorAccessFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(cookieOriginProtectionFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(jwtFilter, CookieOriginProtectionFilter.class)
            .addFilterAfter(rateLimitingFilter, JwtAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(Environment environment) {
        // Orígenes permitidos por env, separados por coma.
        String rawOrigins = environment.getProperty(
            "app.cors.allowed-origins",
            "http://localhost:3002"
        );
        long corsMaxAgeSeconds = environment.getProperty("app.cors.max-age-seconds", Long.class, 86400L);
        List<String> allowedOrigins = Arrays.stream(rawOrigins.split(","))
            .map(String::trim)
            .filter(origin -> !origin.isEmpty())
            .filter(origin -> !"*".equals(origin))
            .toList();

        if (rawOrigins.contains("*")) {
            LOGGER.warn("Se ignoró origen CORS wildcard '*' para evitar uso con credenciales.");
        }
        if (allowedOrigins.isEmpty()) {
            allowedOrigins = List.of("http://localhost:3002");
        }

        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of(
            "Authorization",
            "Content-Type",
            "Accept",
            "Origin",
            "X-Requested-With",
            "X-Plura-Client-Platform",
            "X-Plura-Session-Transport",
            "Idempotency-Key",
            "idempotency-key"
        ));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(corsMaxAgeSeconds);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
