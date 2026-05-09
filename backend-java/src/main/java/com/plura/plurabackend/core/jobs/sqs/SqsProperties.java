package com.plura.plurabackend.core.jobs.sqs;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * SqsProperties es un propiedades de configuracion del modulo jobs / SQS.
 * Responsabilidad: mapear variables de entorno o application.yml a un objeto tipado.
 * Mantiene separada esta responsabilidad para que el resto del backend use una API clara.
 * Foco funcional: la responsabilidad indicada por su paquete y nombre.
 */
@ConfigurationProperties(prefix = "app.sqs")
public class SqsProperties {

    private boolean enabled;
    private String endpoint;
    private String region;
    private String accessKeyId;
    private String secretAccessKey;
    private String queueUrl;
    private String dlqUrl;
    private int waitTimeSeconds = 10;
    private int maxMessages = 10;

    /**
     * Evalua is enabled y devuelve una decision booleana para el llamador.
     */
    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getEndpoint() {
        return endpoint;
    }

    public void setEndpoint(String endpoint) {
        this.endpoint = endpoint;
    }

    public String getRegion() {
        return region;
    }

    public void setRegion(String region) {
        this.region = region;
    }

    public String getAccessKeyId() {
        return accessKeyId;
    }

    public void setAccessKeyId(String accessKeyId) {
        this.accessKeyId = accessKeyId;
    }

    public String getSecretAccessKey() {
        return secretAccessKey;
    }

    public void setSecretAccessKey(String secretAccessKey) {
        this.secretAccessKey = secretAccessKey;
    }

    public String getQueueUrl() {
        return queueUrl;
    }

    public void setQueueUrl(String queueUrl) {
        this.queueUrl = queueUrl;
    }

    public String getDlqUrl() {
        return dlqUrl;
    }

    public void setDlqUrl(String dlqUrl) {
        this.dlqUrl = dlqUrl;
    }

    public int getWaitTimeSeconds() {
        return waitTimeSeconds;
    }

    public void setWaitTimeSeconds(int waitTimeSeconds) {
        this.waitTimeSeconds = waitTimeSeconds;
    }

    public int getMaxMessages() {
        return maxMessages;
    }

    public void setMaxMessages(int maxMessages) {
        this.maxMessages = maxMessages;
    }
}
