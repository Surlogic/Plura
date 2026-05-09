package com.plura.plurabackend.core.cache.redis;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisPassword;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

/**
 * RedisCacheConfig es un configuracion Spring del modulo cache / Redis.
 * Responsabilidad: declarar beans, filtros o parametros transversales que necesita el runtime.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: cache.
 */
@Configuration
@EnableConfigurationProperties(RedisCacheProperties.class)
public class RedisCacheConfig {

    /**
     * Crea la conexion Redis usada por los caches distribuidos.
     */
    @Bean
    @ConditionalOnProperty(
        name = {"cache.enabled", "redis.enabled"},
        havingValue = "true",
        matchIfMissing = false
    )
    public LettuceConnectionFactory redisConnectionFactory(RedisCacheProperties properties) {
        RedisStandaloneConfiguration configuration = new RedisStandaloneConfiguration();
        configuration.setHostName(properties.getHost());
        configuration.setPort(properties.getPort());
        if (properties.getPassword() != null && !properties.getPassword().isBlank()) {
            configuration.setPassword(RedisPassword.of(properties.getPassword()));
        }
        return new LettuceConnectionFactory(configuration);
    }

    /**
     * Configura el template Redis con serializacion consistente para claves y valores.
     */
    @Bean
    @ConditionalOnProperty(
        name = {"cache.enabled", "redis.enabled"},
        havingValue = "true",
        matchIfMissing = false
    )
    public StringRedisTemplate redisTemplate(LettuceConnectionFactory connectionFactory) {
        StringRedisTemplate template = new StringRedisTemplate(connectionFactory);
        template.afterPropertiesSet();
        return template;
    }
}
