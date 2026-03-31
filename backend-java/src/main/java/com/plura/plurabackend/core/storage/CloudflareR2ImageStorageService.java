package com.plura.plurabackend.core.storage;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.net.URI;
import java.time.Duration;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
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
    private final S3Client s3Client;

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

        StaticCredentialsProvider credentialsProvider = StaticCredentialsProvider.create(
            AwsBasicCredentials.create(accessKey.trim(), secretKey.trim())
        );
        Region resolvedRegion = Region.of(region == null || region.isBlank() ? "auto" : region.trim());
        S3Configuration s3Configuration = S3Configuration.builder()
            .pathStyleAccessEnabled(true)
            .build();

        this.presigner = S3Presigner.builder()
            .endpointOverride(URI.create(this.endpoint))
            .region(resolvedRegion)
            .credentialsProvider(credentialsProvider)
            .serviceConfiguration(s3Configuration)
            .build();

        this.s3Client = S3Client.builder()
            .endpointOverride(URI.create(this.endpoint))
            .region(resolvedRegion)
            .credentialsProvider(credentialsProvider)
            .serviceConfiguration(s3Configuration)
            .build();
    }

    @Override
    public String generateUploadUrl(String objectKey) {
        return generateUploadUrl(objectKey, DEFAULT_CONTENT_TYPE, 1L);
    }

    @Override
    public String normalizeStoredReference(String urlOrStorageKey) {
        if (urlOrStorageKey == null) {
            return null;
        }
        String trimmed = stripQueryAndFragment(urlOrStorageKey.trim());
        if (trimmed.isBlank()) {
            return null;
        }
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            String extractedKey = extractManagedKeyFromPublicUrl(trimmed);
            return extractedKey.isBlank() ? trimmed : toStorageUri(extractedKey);
        }
        if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
            return toStorageUri(trimmed);
        }
        return toStorageUri(trimmed);
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

    @Override
    public String storeImage(byte[] bytes, String objectKey, String contentType) {
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            if (bytes == null || bytes.length == 0) {
                throw new IllegalArgumentException("Image bytes are required");
            }
            String normalizedKey = normalizeObjectKey(objectKey);
            String normalizedContentType = normalizeContentType(contentType);
            validateUploadRequest(normalizedContentType, bytes.length);

            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(normalizedKey)
                .contentType(normalizedContentType)
                .contentLength((long) bytes.length)
                .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromBytes(bytes));
            return "r2://" + bucket + "/" + normalizedKey;
        } catch (RuntimeException exception) {
            markR2Error("store_image");
            throw exception;
        } finally {
            sample.stop(
                Timer.builder("plura.image.store.latency")
                    .description("Image storage latency")
                    .tag("provider", "r2")
                    .register(meterRegistry)
            );
        }
    }

    @Override
    public boolean deleteImage(String objectKeyOrUrl) {
        if (objectKeyOrUrl == null || objectKeyOrUrl.isBlank()) {
            return false;
        }
        try {
            String key = extractDeletableKey(objectKeyOrUrl);
            if (key.isBlank() || key.equals("missing")) {
                return false;
            }
            DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build();
            s3Client.deleteObject(deleteRequest);
            return true;
        } catch (RuntimeException exception) {
            markR2Error("delete_image");
            LoggerFactory.getLogger(getClass()).warn("No se pudo eliminar imagen R2: {}", objectKeyOrUrl, exception);
            return false;
        }
    }

    private String extractDeletableKey(String urlOrKey) {
        String value = urlOrKey.trim();
        if (value.startsWith("r2://")) {
            String withoutScheme = value.substring("r2://".length()).replaceFirst("^/+", "");
            int slash = withoutScheme.indexOf('/');
            if (slash > 0 && withoutScheme.substring(0, slash).equals(bucket)) {
                return normalizeObjectKey(withoutScheme.substring(slash + 1));
            }
            return normalizeObjectKey(withoutScheme);
        }
        if (value.startsWith("r2:")) {
            return normalizeObjectKey(value.substring("r2:".length()).replaceFirst("^/+", ""));
        }
        if (value.startsWith("http://") || value.startsWith("https://")) {
            String baseToCheck = !publicBaseUrl.isBlank() ? publicBaseUrl : endpoint + "/" + bucket;
            if (value.startsWith(baseToCheck + "/")) {
                return normalizeObjectKey(value.substring(baseToCheck.length() + 1));
            }
            return "";
        }
        if (value.startsWith("/")) {
            return "";
        }
        return normalizeObjectKey(value);
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
        String key = normalizeObjectKey(objectKey);
        if (!publicBaseUrl.isBlank()) {
            return publicBaseUrl + "/" + key;
        }
        return endpoint + "/" + bucket + "/" + key;
    }

    private String extractManagedKeyFromPublicUrl(String url) {
        String normalizedUrl = stripQueryAndFragment(url);
        String publicBase = !publicBaseUrl.isBlank() ? publicBaseUrl : endpoint + "/" + bucket;
        String key = extractKeyFromBase(normalizedUrl, publicBase);
        if (!key.isBlank()) {
            return key;
        }
        return extractKeyFromBase(normalizedUrl, endpoint + "/" + bucket);
    }

    private String extractKeyFromBase(String url, String base) {
        String normalizedBase = stripQueryAndFragment(base);
        if (normalizedBase.isBlank()) {
            return "";
        }
        if (url.equals(normalizedBase)) {
            return "";
        }
        if (!url.startsWith(normalizedBase + "/")) {
            return "";
        }
        return normalizeObjectKey(url.substring(normalizedBase.length() + 1));
    }

    private String stripQueryAndFragment(String value) {
        String normalized = value == null ? "" : value.trim();
        int queryIndex = normalized.indexOf('?');
        if (queryIndex >= 0) {
            normalized = normalized.substring(0, queryIndex);
        }
        int fragmentIndex = normalized.indexOf('#');
        if (fragmentIndex >= 0) {
            normalized = normalized.substring(0, fragmentIndex);
        }
        return normalized;
    }

    private String toStorageUri(String objectKeyOrUrl) {
        String key = normalizeObjectKey(objectKeyOrUrl);
        return key.equals("missing") ? null : "r2://" + bucket + "/" + key;
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
