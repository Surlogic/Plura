package com.plura.plurabackend.core.cache.redis;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * RedisCacheProperties es un propiedades de configuracion del modulo cache / Redis.
 * Responsabilidad: mapear variables de entorno o application.yml a un objeto tipado.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: cache.
 */
@ConfigurationProperties(prefix = "redis")
public class RedisCacheProperties {

    private String host = "localhost";
    private int port = 6379;
    private String password;
    private long ttlSeconds = 300;

    public String getHost() {
        return host;
    }

    public void setHost(String host) {
        this.host = host;
    }

    public int getPort() {
        return port;
    }

    public void setPort(int port) {
        this.port = port;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public long getTtlSeconds() {
        return ttlSeconds;
    }

    public void setTtlSeconds(long ttlSeconds) {
        this.ttlSeconds = ttlSeconds;
    }
}
