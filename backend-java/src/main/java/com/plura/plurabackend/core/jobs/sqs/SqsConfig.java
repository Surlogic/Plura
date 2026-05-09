package com.plura.plurabackend.core.jobs.sqs;

import java.net.URI;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.sqs.SqsClientBuilder;

/**
 * SqsConfig es un configuracion Spring del modulo jobs / SQS.
 * Responsabilidad: declarar beans, filtros o parametros transversales que necesita el runtime.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: la responsabilidad indicada por su paquete y nombre.
 */
@Configuration
@EnableConfigurationProperties(SqsProperties.class)
public class SqsConfig {

    /**
     * Ejecuta la logica de sqs cliente manteniendola encapsulada en este componente.
     */
    @Bean
    @ConditionalOnProperty(name = "app.sqs.enabled", havingValue = "true")
    public SqsClient sqsClient(SqsProperties properties) {
        SqsClientBuilder builder = SqsClient.builder()
            .region(Region.of(properties.getRegion() == null || properties.getRegion().isBlank()
                ? "us-east-1"
                : properties.getRegion().trim()));

        if (properties.getEndpoint() != null && !properties.getEndpoint().isBlank()) {
            builder.endpointOverride(URI.create(properties.getEndpoint().trim()));
        }

        if (properties.getAccessKeyId() != null && !properties.getAccessKeyId().isBlank()) {
            builder.credentialsProvider(
                StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(
                        properties.getAccessKeyId().trim(),
                        properties.getSecretAccessKey() == null ? "" : properties.getSecretAccessKey().trim()
                    )
                )
            );
        } else {
            builder.credentialsProvider(DefaultCredentialsProvider.create());
        }

        return builder.build();
    }
}
