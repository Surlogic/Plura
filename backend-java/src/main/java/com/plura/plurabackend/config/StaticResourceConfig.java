package com.plura.plurabackend.config;

import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * StaticResourceConfig es un configuracion Spring del modulo configuracion.
 * Responsabilidad: declarar beans, filtros o parametros transversales que necesita el runtime.
 * Colabora con: uploadRootPath.
 * Foco funcional: la responsabilidad indicada por su paquete y nombre.
 */
@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {

    private final Path uploadRootPath;

    public StaticResourceConfig(@Value("${app.storage.upload-dir:uploads}") String uploadDir) {
        this.uploadRootPath = Path.of(uploadDir).toAbsolutePath().normalize();
    }

    /**
     * Agrega resource handlers validando que no duplique ni rompa reglas del dominio.
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = uploadRootPath.toUri().toString();
        if (!location.endsWith("/")) {
            location = location + "/";
        }
        registry.addResourceHandler("/uploads/**").addResourceLocations(location);
    }
}
