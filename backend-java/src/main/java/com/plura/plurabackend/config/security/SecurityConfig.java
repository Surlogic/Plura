package com.plura.plurabackend.config.security;

import com.plura.plurabackend.config.jwt.JwtAuthenticationFilter;
import java.util.Arrays;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter)
        throws Exception {
        http
            // API stateless: no sesiones y sin CSRF para API token-based.
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Permite preflight CORS.
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // Endpoints públicos de autenticación.
                .requestMatchers(
                    "/auth/login",
                    "/auth/login/**",
                    "/auth/register",
                    "/auth/register/**",
                    "/auth/refresh",
                    "/auth/logout",
                    "/health",
                    "/error"
                ).permitAll()
                .requestMatchers("/public/**").permitAll()
                .requestMatchers("/auth/me/profesional").hasRole("PROFESSIONAL")
                .requestMatchers("/auth/me/cliente").hasRole("USER")
                .requestMatchers("/profesional/**").hasRole("PROFESSIONAL")
                .requestMatchers("/cliente/**").hasRole("USER")
                // Swagger público (idealmente deshabilitar en prod).
                .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                // Todo lo demás requiere JWT válido.
                .anyRequest().authenticated()
            )
            // Respuesta 401 si no hay autenticación.
            .exceptionHandling(ex -> ex.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(Environment environment) {
        // Orígenes permitidos por env, separados por coma.
        String rawOrigins = environment.getProperty(
            "app.cors.allowed-origins",
            "http://localhost:3002"
        );
        List<String> allowedOrigins = Arrays.stream(rawOrigins.split(","))
            .map(String::trim)
            .filter(origin -> !origin.isEmpty())
            .toList();

        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
