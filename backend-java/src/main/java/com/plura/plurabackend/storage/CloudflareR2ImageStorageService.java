package com.plura.plurabackend.storage;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.net.URI;
import java.time.Duration;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Service
@ConditionalOnExpression("'${app.storage.provider:local}'.equalsIgnoreCase('r2')")
public class CloudflareR2ImageStorageService implements ImageStorageService {

    private static final String DEFAULT_CONTENT_TYPE = "image/jpeg";

    private final String endpoint;
    private final String bucket;
    private final String publicBaseUrl;
    private final long maxUploadBytes;
    private final Duration uploadUrlExpiration;
    private final Set<String> allowedContentTypes;
    private final MeterRegistry meterRegistry;
    private final S3Presigner presigner;

    public CloudflareR2ImageStorageService(
        @Value("${app.storage.r2.endpoint:}") String endpoint,
        @Value("${app.storage.r2.bucket:plura-images}") String bucket,
        @Value("${app.storage.r2.public-base-url:}") String publicBaseUrl,
        @Value("${app.storage.r2.region:auto}") String region,
        @Value("${app.storage.r2.access-key-id:}") String accessKey,
        @Value("${app.storage.r2.secret-access-key:}") String secretKey,
        @Value("${app.storage.max-upload-bytes:5242880}") long maxUploadBytes,
        @Value("${app.storage.upload-url-expiration-minutes:10}") long uploadUrlExpirationMinutes,
        @Value("${app.storage.allowed-content-types:image/jpeg,image/png,image/webp,image/avif}") String allowedContentTypes,
        MeterRegistry meterRegistry
    ) {
        this.endpoint = normalizeEndpoint(endpoint);
        this.bucket = sanitizeBucket(bucket);
        this.publicBaseUrl = normalizePublicBaseUrl(publicBaseUrl);
        this.maxUploadBytes = Math.max(1L, maxUploadBytes);
        this.uploadUrlExpiration = Duration.ofMinutes(Math.max(1L, uploadUrlExpirationMinutes));
        this.allowedContentTypes = Arrays.stream(allowedContentTypes.split(","))
            .map(value -> value == null ? "" : value.trim().toLowerCase(Locale.ROOT))
            .filter(value -> !value.isBlank())
            .collect(Collectors.toUnmodifiableSet());
        this.meterRegistry = meterRegistry;

        if (this.endpoint.isBlank() || accessKey == null || accessKey.isBlank() || secretKey == null || secretKey.isBlank()) {
            throw new IllegalStateException("R2 provider requires endpoint and credentials");
        }

        this.presigner = S3Presigner.builder()
            .endpointOverride(URI.create(this.endpoint))
            .region(Region.of(region == null || region.isBlank() ? "auto" : region.trim()))
            .credentialsProvider(
                StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(accessKey.trim(), secretKey.trim())
                )
            )
            .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build())
            .build();
    }

    @Override
    public String generateUploadUrl(String objectKey) {
        return generateUploadUrl(objectKey, DEFAULT_CONTENT_TYPE, 1L);
    }

    @Override
    public String generateUploadUrl(String objectKey, String contentType, long contentLength) {
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            String normalizedKey = normalizeObjectKey(objectKey);
            String normalizedContentType = normalizeContentType(contentType);
            validateUploadRequest(normalizedContentType, contentLength);

            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(normalizedKey)
                .contentType(normalizedContentType)
                .build();

            PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(uploadUrlExpiration)
                .putObjectRequest(putObjectRequest)
                .build();

            PresignedPutObjectRequest presigned = presigner.presignPutObject(presignRequest);
            return presigned.url().toString();
        } catch (RuntimeException exception) {
            markR2Error("upload_url");
            throw exception;
        } finally {
            sample.stop(
                Timer.builder("plura.image.upload_url.latency")
                    .description("Image upload URL generation latency")
                    .tag("provider", "r2")
                    .register(meterRegistry)
            );
        }
    }

    @Override
    public String generatePublicUrl(String objectKey) {
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            if (objectKey == null || objectKey.isBlank()) {
                return buildPublicUrl("missing");
            }
            String trimmed = objectKey.trim();
            if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
                return trimmed;
            }
            return buildPublicUrl(normalizeObjectKey(trimmed));
        } catch (RuntimeException exception) {
            markR2Error("public_url");
            throw exception;
        } finally {
            sample.stop(
                Timer.builder("plura.image.public_url.generate.latency")
                    .description("Image public URL generation latency")
                    .tag("provider", "r2")
                    .register(meterRegistry)
            );
        }
    }

    private void validateUploadRequest(String contentType, long contentLength) {
        if (contentLength <= 0L || contentLength > maxUploadBytes) {
            throw new IllegalArgumentException("Invalid upload size");
        }
        if (!contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Only image/* content types are allowed");
        }
        if (!allowedContentTypes.isEmpty() && !allowedContentTypes.contains(contentType)) {
            throw new IllegalArgumentException("Unsupported image content type");
        }
    }

    private String buildPublicUrl(String objectKey) {
        String key = objectKey == null || objectKey.isBlank() ? "missing" : objectKey;
        if (!publicBaseUrl.isBlank()) {
            return publicBaseUrl + "/" + key;
        }
        return endpoint + "/" + bucket + "/" + key;
    }

    private String normalizeObjectKey(String rawObjectKey) {
        if (rawObjectKey == null || rawObjectKey.isBlank()) {
            return "missing";
        }
        String value = rawObjectKey.trim();
        if (value.startsWith("r2://")) {
            String withoutScheme = value.substring("r2://".length()).replaceFirst("^/+", "");
            int slash = withoutScheme.indexOf('/');
            if (slash > 0 && withoutScheme.substring(0, slash).equals(bucket)) {
                value = withoutScheme.substring(slash + 1);
            } else {
                value = withoutScheme;
            }
        } else if (value.startsWith("r2:")) {
            value = value.substring("r2:".length()).replaceFirst("^/+", "");
        }
        return value
            .replace('\\', '/')
            .replace("..", "")
            .replaceFirst("^/+", "");
    }

    private String normalizeContentType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return DEFAULT_CONTENT_TYPE;
        }
        return contentType.trim().toLowerCase(Locale.ROOT);
    }

    private String sanitizeBucket(String rawBucket) {
        if (rawBucket == null || rawBucket.isBlank()) {
            return "plura-images";
        }
        return rawBucket.trim();
    }

    private String normalizeEndpoint(String rawEndpoint) {
        if (rawEndpoint == null || rawEndpoint.isBlank()) {
            return "";
        }
        String value = rawEndpoint.trim();
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private String normalizePublicBaseUrl(String rawPublicBaseUrl) {
        if (rawPublicBaseUrl == null || rawPublicBaseUrl.isBlank()) {
            return "";
        }
        String value = rawPublicBaseUrl.trim();
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private void markR2Error(String operation) {
        Counter.builder("plura.image.r2.errors")
            .description("R2 image storage errors")
            .tag("operation", operation)
            .register(meterRegistry)
            .increment();
    }
}
