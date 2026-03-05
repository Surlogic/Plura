package com.plura.plurabackend.cache.redis;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisPassword;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

@Configuration
@EnableConfigurationProperties(RedisCacheProperties.class)
public class RedisCacheConfig {

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
