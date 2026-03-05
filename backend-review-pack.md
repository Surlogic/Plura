# BACKEND REVIEW PACK

Generated: 2026-03-05T11:45:54-03:00
Backend root: backend-java

## Notes
- Included full content of key backend files for architecture, auth, ORM, repositories, controllers, and config analysis.
- Runtime secrets are excluded. The file does not include .env contents.
- If needed, provide .env.example placeholders later.

## Tree
```
./.dockerignore
./.gitattributes
./.gitignore
./Dockerfile
./HELP.md
./PHASE4_ROLLOUT_RUNBOOK.md
./README.md
./build.gradle
./db/booking_hardening.sql
./db/business_photo.sql
./db/functional_integrity_audit.sql
./db/functional_integrity_checklist.md
./db/oauth_user_columns.sql
./db/performance_indexes.sql
./db/phase2_critical_indexes_2026_03_05.sql
./db/phase3_cache_availability_2026_03_05.sql
./db/phase4_schedule_summary_2026_03_05.sql
./db/professional_coordinates.sql
./db/refresh_token_unify_user.sql
./db/rename_user_tables.sql
./db/search_scale_foundation.sql
./db/service_description_image.sql
./db/service_post_buffer_minutes.sql
./db/slot_duration_minutes.sql
./docker-compose.phase4.yml
./docs/architecture/PHASE4_FLAGS_2026-03-05.md
./docs/architecture/PHASE4_TARGET_ARCHITECTURE_2026-03-05.md
./docs/release/PERF_LAYER_ROLLOUT_RUNBOOK_2026-03-05.md
./gradle/wrapper/gradle-wrapper.jar
./gradle/wrapper/gradle-wrapper.properties
./gradlew
./gradlew.bat
./scripts/audit_public_consistency.sh
./scripts/geocode_professional_profiles.sh
./scripts/loadtests/perf_phase3_rollout.js
./scripts/release/run_phase3_migrations.sh
./scripts/release/run_phase4_migrations.sh
./settings.gradle
./src/main/java/com/plura/plurabackend/PluraBackendApplication.java
./src/main/java/com/plura/plurabackend/auth/AuthController.java
./src/main/java/com/plura/plurabackend/auth/AuthService.java
./src/main/java/com/plura/plurabackend/auth/dto/LoginRequest.java
./src/main/java/com/plura/plurabackend/auth/dto/ProfesionalProfileResponse.java
./src/main/java/com/plura/plurabackend/auth/dto/RegisterProfesionalRequest.java
./src/main/java/com/plura/plurabackend/auth/dto/RegisterRequest.java
./src/main/java/com/plura/plurabackend/auth/dto/RegisterResponse.java
./src/main/java/com/plura/plurabackend/auth/dto/UserResponse.java
./src/main/java/com/plura/plurabackend/auth/model/RefreshToken.java
./src/main/java/com/plura/plurabackend/auth/oauth/OAuthService.java
./src/main/java/com/plura/plurabackend/auth/oauth/OAuthUserInfo.java
./src/main/java/com/plura/plurabackend/auth/oauth/dto/OAuthLoginRequest.java
./src/main/java/com/plura/plurabackend/auth/oauth/providers/AppleTokenVerifier.java
./src/main/java/com/plura/plurabackend/auth/oauth/providers/GoogleTokenVerifier.java
./src/main/java/com/plura/plurabackend/auth/repository/RefreshTokenRepository.java
./src/main/java/com/plura/plurabackend/availability/AvailableSlotAsyncDispatcher.java
./src/main/java/com/plura/plurabackend/availability/AvailableSlotBootstrap.java
./src/main/java/com/plura/plurabackend/availability/AvailableSlotScheduler.java
./src/main/java/com/plura/plurabackend/availability/AvailableSlotService.java
./src/main/java/com/plura/plurabackend/availability/ScheduleSummaryScheduler.java
./src/main/java/com/plura/plurabackend/availability/ScheduleSummaryService.java
./src/main/java/com/plura/plurabackend/availability/model/AvailableSlot.java
./src/main/java/com/plura/plurabackend/availability/model/AvailableSlotStatus.java
./src/main/java/com/plura/plurabackend/availability/repository/AvailableSlotRepository.java
./src/main/java/com/plura/plurabackend/booking/BookingClientController.java
./src/main/java/com/plura/plurabackend/booking/BookingClientService.java
./src/main/java/com/plura/plurabackend/booking/dto/ClientNextBookingResponse.java
./src/main/java/com/plura/plurabackend/booking/dto/ProfessionalBookingCreateRequest.java
./src/main/java/com/plura/plurabackend/booking/dto/ProfessionalBookingResponse.java
./src/main/java/com/plura/plurabackend/booking/dto/ProfessionalBookingUpdateRequest.java
./src/main/java/com/plura/plurabackend/booking/dto/PublicBookingRequest.java
./src/main/java/com/plura/plurabackend/booking/dto/PublicBookingResponse.java
./src/main/java/com/plura/plurabackend/booking/model/Booking.java
./src/main/java/com/plura/plurabackend/booking/model/BookingStatus.java
./src/main/java/com/plura/plurabackend/booking/repository/BookingRepository.java
./src/main/java/com/plura/plurabackend/cache/InMemoryProfileCacheService.java
./src/main/java/com/plura/plurabackend/cache/InMemorySearchCacheService.java
./src/main/java/com/plura/plurabackend/cache/InMemorySlotCacheService.java
./src/main/java/com/plura/plurabackend/cache/ProfileCacheService.java
./src/main/java/com/plura/plurabackend/cache/ProfileCacheServiceFacade.java
./src/main/java/com/plura/plurabackend/cache/SearchCacheService.java
./src/main/java/com/plura/plurabackend/cache/SearchCacheServiceFacade.java
./src/main/java/com/plura/plurabackend/cache/SlotCacheService.java
./src/main/java/com/plura/plurabackend/cache/SlotCacheServiceFacade.java
./src/main/java/com/plura/plurabackend/cache/redis/RedisCacheConfig.java
./src/main/java/com/plura/plurabackend/cache/redis/RedisCacheProperties.java
./src/main/java/com/plura/plurabackend/cache/redis/RedisJsonCacheAdapter.java
./src/main/java/com/plura/plurabackend/category/CategoryController.java
./src/main/java/com/plura/plurabackend/category/CategorySeedConfig.java
./src/main/java/com/plura/plurabackend/category/CategoryService.java
./src/main/java/com/plura/plurabackend/category/dto/CategoryResponse.java
./src/main/java/com/plura/plurabackend/category/model/Category.java
./src/main/java/com/plura/plurabackend/category/repository/CategoryRepository.java
./src/main/java/com/plura/plurabackend/common/util/SlugUtils.java
./src/main/java/com/plura/plurabackend/config/AsyncConfig.java
./src/main/java/com/plura/plurabackend/config/CacheConfig.java
./src/main/java/com/plura/plurabackend/config/StaticResourceConfig.java
./src/main/java/com/plura/plurabackend/config/error/GlobalExceptionHandler.java
./src/main/java/com/plura/plurabackend/config/jwt/JwtAuthenticationFilter.java
./src/main/java/com/plura/plurabackend/config/ratelimit/RateLimitingFilter.java
./src/main/java/com/plura/plurabackend/config/security/PasswordConfig.java
./src/main/java/com/plura/plurabackend/config/security/SecurityConfig.java
./src/main/java/com/plura/plurabackend/geo/GeoAutocompleteRepository.java
./src/main/java/com/plura/plurabackend/geo/GeoController.java
./src/main/java/com/plura/plurabackend/geo/dto/GeoAutocompleteItemResponse.java
./src/main/java/com/plura/plurabackend/health/HealthController.java
./src/main/java/com/plura/plurabackend/home/HomeController.java
./src/main/java/com/plura/plurabackend/home/HomeService.java
./src/main/java/com/plura/plurabackend/home/dto/HomeResponse.java
./src/main/java/com/plura/plurabackend/home/dto/HomeStatsResponse.java
./src/main/java/com/plura/plurabackend/home/dto/HomeTopProfessionalResponse.java
./src/main/java/com/plura/plurabackend/jobs/JobIdempotencyService.java
./src/main/java/com/plura/plurabackend/jobs/JobType.java
./src/main/java/com/plura/plurabackend/jobs/QueueJobMessage.java
./src/main/java/com/plura/plurabackend/jobs/sqs/SqsConfig.java
./src/main/java/com/plura/plurabackend/jobs/sqs/SqsJobQueueService.java
./src/main/java/com/plura/plurabackend/jobs/sqs/SqsJobWorker.java
./src/main/java/com/plura/plurabackend/jobs/sqs/SqsProperties.java
./src/main/java/com/plura/plurabackend/professional/BookingService.java
./src/main/java/com/plura/plurabackend/professional/ProfesionalConfigController.java
./src/main/java/com/plura/plurabackend/professional/ProfesionalPublicController.java
./src/main/java/com/plura/plurabackend/professional/ProfesionalPublicPageCoreService.java
./src/main/java/com/plura/plurabackend/professional/ProfesionalPublicPageService.java
./src/main/java/com/plura/plurabackend/professional/ProfessionalProfileService.java
./src/main/java/com/plura/plurabackend/professional/ScheduleService.java
./src/main/java/com/plura/plurabackend/professional/dto/ProfesionalBusinessProfileUpdateRequest.java
./src/main/java/com/plura/plurabackend/professional/dto/ProfesionalPublicPageResponse.java
./src/main/java/com/plura/plurabackend/professional/dto/ProfesionalPublicPageUpdateRequest.java
./src/main/java/com/plura/plurabackend/professional/dto/ProfesionalPublicSummaryResponse.java
./src/main/java/com/plura/plurabackend/professional/model/ProfessionalProfile.java
./src/main/java/com/plura/plurabackend/professional/photo/model/BusinessPhoto.java
./src/main/java/com/plura/plurabackend/professional/photo/model/BusinessPhotoType.java
./src/main/java/com/plura/plurabackend/professional/photo/repository/BusinessPhotoRepository.java
./src/main/java/com/plura/plurabackend/professional/repository/ProfessionalProfileRepository.java
./src/main/java/com/plura/plurabackend/professional/schedule/dto/ProfesionalScheduleDayDto.java
./src/main/java/com/plura/plurabackend/professional/schedule/dto/ProfesionalScheduleDto.java
./src/main/java/com/plura/plurabackend/professional/schedule/dto/ProfesionalSchedulePauseDto.java
./src/main/java/com/plura/plurabackend/professional/schedule/dto/ProfesionalScheduleRangeDto.java
./src/main/java/com/plura/plurabackend/professional/service/ServiceImageStorageService.java
./src/main/java/com/plura/plurabackend/professional/service/dto/ProfesionalServiceRequest.java
./src/main/java/com/plura/plurabackend/professional/service/dto/ProfesionalServiceResponse.java
./src/main/java/com/plura/plurabackend/professional/service/model/ProfesionalService.java
./src/main/java/com/plura/plurabackend/professional/service/repository/ProfesionalServiceRepository.java
./src/main/java/com/plura/plurabackend/search/SearchController.java
./src/main/java/com/plura/plurabackend/search/SearchNativeRepository.java
./src/main/java/com/plura/plurabackend/search/SearchQueryCriteria.java
./src/main/java/com/plura/plurabackend/search/SearchService.java
./src/main/java/com/plura/plurabackend/search/SearchSuggestCriteria.java
./src/main/java/com/plura/plurabackend/search/dto/SearchItemResponse.java
./src/main/java/com/plura/plurabackend/search/dto/SearchResponse.java
./src/main/java/com/plura/plurabackend/search/dto/SearchSort.java
./src/main/java/com/plura/plurabackend/search/dto/SearchSuggestCategoryResponse.java
./src/main/java/com/plura/plurabackend/search/dto/SearchSuggestItemResponse.java
./src/main/java/com/plura/plurabackend/search/dto/SearchSuggestResponse.java
./src/main/java/com/plura/plurabackend/search/dto/SearchType.java
./src/main/java/com/plura/plurabackend/search/engine/MeiliSearchEngineClient.java
./src/main/java/com/plura/plurabackend/search/engine/SearchEngineClient.java
./src/main/java/com/plura/plurabackend/search/engine/SearchEngineSearchResult.java
./src/main/java/com/plura/plurabackend/search/engine/SearchIndexDocument.java
./src/main/java/com/plura/plurabackend/search/engine/SearchIndexService.java
./src/main/java/com/plura/plurabackend/search/engine/SearchIndexWorker.java
./src/main/java/com/plura/plurabackend/search/engine/SearchIndexer.java
./src/main/java/com/plura/plurabackend/search/engine/SearchReindexRunner.java
./src/main/java/com/plura/plurabackend/search/engine/SearchSyncPublisher.java
./src/main/java/com/plura/plurabackend/storage/CloudflareR2ImageStorageService.java
./src/main/java/com/plura/plurabackend/storage/ImageStorageService.java
./src/main/java/com/plura/plurabackend/storage/LocalImageStorageService.java
./src/main/java/com/plura/plurabackend/storage/thumbnail/ImageThumbnailJobService.java
./src/main/java/com/plura/plurabackend/storage/thumbnail/LocalImageThumbnailJobService.java
./src/main/java/com/plura/plurabackend/storage/thumbnail/SqsBackedImageThumbnailJobService.java
./src/main/java/com/plura/plurabackend/user/model/User.java
./src/main/java/com/plura/plurabackend/user/model/UserRole.java
./src/main/java/com/plura/plurabackend/user/repository/UserRepository.java
./src/main/resources/application.yml
./src/test/java/com/plura/plurabackend/PluraBackendApplicationTests.java
./src/test/java/com/plura/plurabackend/search/SearchServiceTest.java
./src/test/java/com/plura/plurabackend/storage/LocalImageStorageServiceTest.java
```

## Payment/Billing/Webhook Discovery
```
backend-java/src/main/java/com/plura/plurabackend/availability/AvailableSlotService.java:39:import org.springframework.transaction.PlatformTransactionManager;
backend-java/src/main/java/com/plura/plurabackend/availability/AvailableSlotService.java:41:import org.springframework.transaction.support.TransactionTemplate;
backend-java/src/main/java/com/plura/plurabackend/availability/AvailableSlotService.java:79:    private final TransactionTemplate transactionTemplate;
backend-java/src/main/java/com/plura/plurabackend/availability/AvailableSlotService.java:91:        PlatformTransactionManager transactionManager,
backend-java/src/main/java/com/plura/plurabackend/availability/AvailableSlotService.java:102:        this.transactionTemplate = new TransactionTemplate(transactionManager);
backend-java/src/main/java/com/plura/plurabackend/availability/AvailableSlotService.java:123:            transactionTemplate.executeWithoutResult(status -> rebuildBatch(batch, from, to));
backend-java/src/main/java/com/plura/plurabackend/availability/AvailableSlotService.java:146:            .ifPresent(profile -> transactionTemplate.executeWithoutResult(
backend-java/src/main/java/com/plura/plurabackend/availability/AvailableSlotService.java:157:            .ifPresent(profile -> transactionTemplate.executeWithoutResult(
backend-java/src/main/java/com/plura/plurabackend/availability/ScheduleSummaryService.java:29:import org.springframework.transaction.annotation.Transactional;
backend-java/src/main/java/com/plura/plurabackend/availability/ScheduleSummaryService.java:111:    @Transactional
backend-java/src/main/java/com/plura/plurabackend/availability/ScheduleSummaryService.java:147:    @Transactional
backend-java/src/main/java/com/plura/plurabackend/home/HomeService.java:33:import org.springframework.transaction.annotation.Transactional;
backend-java/src/main/java/com/plura/plurabackend/home/HomeService.java:65:    @Transactional(readOnly = true)
backend-java/src/main/java/com/plura/plurabackend/professional/ProfesionalPublicPageCoreService.java:85:import org.springframework.transaction.annotation.Transactional;
backend-java/src/main/java/com/plura/plurabackend/professional/ProfesionalPublicPageCoreService.java:86:import org.springframework.transaction.support.TransactionSynchronization;
backend-java/src/main/java/com/plura/plurabackend/professional/ProfesionalPublicPageCoreService.java:87:import org.springframework.transaction.support.TransactionSynchronizationManager;
backend-java/src/main/java/com/plura/plurabackend/professional/ProfesionalPublicPageCoreService.java:261:    @Transactional
backend-java/src/main/java/com/plura/plurabackend/professional/ProfesionalPublicPageCoreService.java:392:    @Transactional
backend-java/src/main/java/com/plura/plurabackend/professional/ProfesionalPublicPageCoreService.java:430:    @Transactional
backend-java/src/main/java/com/plura/plurabackend/professional/ProfesionalPublicPageCoreService.java:532:    @Transactional
backend-java/src/main/java/com/plura/plurabackend/professional/ProfesionalPublicPageCoreService.java:567:    @Transactional
backend-java/src/main/java/com/plura/plurabackend/professional/ProfesionalPublicPageCoreService.java:664:    @Transactional
backend-java/src/main/java/com/plura/plurabackend/professional/ProfesionalPublicPageCoreService.java:804:            if (TransactionSynchronizationManager.isSynchronizationActive()) {
backend-java/src/main/java/com/plura/plurabackend/professional/ProfesionalPublicPageCoreService.java:805:                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
backend-java/src/main/java/com/plura/plurabackend/professional/ProfesionalPublicPageCoreService.java:838:            if (TransactionSynchronizationManager.isSynchronizationActive()) {
backend-java/src/main/java/com/plura/plurabackend/professional/ProfesionalPublicPageCoreService.java:839:                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
backend-java/src/main/java/com/plura/plurabackend/auth/AuthService.java:44:import org.springframework.transaction.annotation.Transactional;
backend-java/src/main/java/com/plura/plurabackend/auth/AuthService.java:116:    @Transactional
backend-java/src/main/java/com/plura/plurabackend/auth/AuthService.java:134:    @Transactional
backend-java/src/main/java/com/plura/plurabackend/auth/AuthService.java:224:    @Transactional
backend-java/src/main/java/com/plura/plurabackend/auth/AuthService.java:278:    @Transactional
backend-java/src/main/java/com/plura/plurabackend/auth/AuthService.java:314:    @Transactional
```

## Files

### FILE: backend-java/HELP.md
```markdown
# Getting Started

### Reference Documentation
For further reference, please consider the following sections:

* [Official Gradle documentation](https://docs.gradle.org)
* [Spring Boot Gradle Plugin Reference Guide](https://docs.spring.io/spring-boot/3.5.0/gradle-plugin)
* [Create an OCI image](https://docs.spring.io/spring-boot/3.5.0/gradle-plugin/packaging-oci-image.html)
* [Spring Web](https://docs.spring.io/spring-boot/3.5.0/reference/web/servlet.html)
* [Spring Data JPA](https://docs.spring.io/spring-boot/3.5.0/reference/data/sql.html#data.sql.jpa-and-spring-data)

### Guides
The following guides illustrate how to use some features concretely:

* [Building a RESTful Web Service](https://spring.io/guides/gs/rest-service/)
* [Serving Web Content with Spring MVC](https://spring.io/guides/gs/serving-web-content/)
* [Building REST services with Spring](https://spring.io/guides/tutorials/rest/)
* [Accessing Data with JPA](https://spring.io/guides/gs/accessing-data-jpa/)

### Additional Links
These additional references should also help you:

* [Gradle Build Scans – insights for your project's build](https://scans.gradle.com#gradle)

```

### FILE: backend-java/README.md
```markdown
# Backend Java

## Timezone del sistema (MVP)
- Zona fija: `APP_TIMEZONE` (default `America/Montevideo`).
- Endpoint de slots y creación de reservas usan esta zona para:
  - calcular "horas pasadas";
  - validar fecha futura;
  - interpretar `startDateTime` recibido.
- Recomendación de contrato frontend:
  - enviar `date` como `YYYY-MM-DD` para slots;
  - enviar `startDateTime` en ISO (`YYYY-MM-DDTHH:mm` o con offset, ej. `2026-02-27T13:00:00Z`).

## Search de escala (PostGIS + trigram)
- Script SQL: `backend-java/db/search_scale_foundation.sql`
- Extensiones: `postgis`, `pg_trgm`, `unaccent`, `pgcrypto`.
- Crea/actualiza:
  - columnas geo y ranking en `professional_profile`;
  - tabla `available_slot` (precomputada);
  - tabla `geo_location_seed` para autocomplete;
  - índices GIST/GIN y de filtros.

Aplicación manual:

```bash
psql \"$SPRING_DATASOURCE_URL\" -f backend-java/db/search_scale_foundation.sql
psql \"$SPRING_DATASOURCE_URL\" -f backend-java/db/professional_coordinates.sql
```

## Geocodificación de direcciones existentes
- Script: `backend-java/scripts/geocode_professional_profiles.sh`
- Requisitos:
  - `NEXT_PUBLIC_MAPBOX_TOKEN` exportado en el entorno.
  - `.env` del backend con `SPRING_DATASOURCE_*`.

Ejemplo:

```bash
export NEXT_PUBLIC_MAPBOX_TOKEN=pk...
backend-java/scripts/geocode_professional_profiles.sh 500
```
```

### FILE: backend-java/build.gradle
```groovy
plugins {
	id 'java'
	id 'org.springframework.boot' version '3.5.0'
	id 'io.spring.dependency-management' version '1.1.7'
}

group = 'com.plura'
version = '0.0.1-SNAPSHOT'
description = 'Demo project for Spring Boot'

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(17)
	}
}

configurations {
	compileOnly {
		extendsFrom annotationProcessor
	}
}

repositories {
	mavenCentral()
}

dependencies {
	implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
	implementation 'org.springframework.boot:spring-boot-starter-security'
	implementation 'org.springframework.boot:spring-boot-starter-web'
	implementation 'org.springframework.boot:spring-boot-starter-actuator'
	implementation 'org.springframework.boot:spring-boot-starter-cache'
	implementation 'org.springframework.boot:spring-boot-starter-data-redis'
	implementation 'com.github.ben-manes.caffeine:caffeine'
	implementation platform('software.amazon.awssdk:bom:2.42.6')
	implementation 'software.amazon.awssdk:s3'
	implementation 'software.amazon.awssdk:sqs'
	implementation 'software.amazon.awssdk:auth'
	implementation 'software.amazon.awssdk:url-connection-client'
	implementation 'com.bucket4j:bucket4j_jdk17-core:8.14.0'
	implementation 'org.springframework.boot:spring-boot-starter-validation'
	implementation 'org.springdoc:springdoc-openapi-starter-webmvc-ui:2.6.0'
	implementation 'org.springframework.security:spring-security-crypto'
	implementation 'com.google.api-client:google-api-client:2.7.2'
	implementation 'com.auth0:java-jwt:4.4.0'
	implementation 'io.github.cdimascio:dotenv-java:3.0.0'
	compileOnly 'org.projectlombok:lombok'
	runtimeOnly 'org.postgresql:postgresql'
	annotationProcessor 'org.projectlombok:lombok'
	testImplementation 'org.springframework.boot:spring-boot-starter-test'
	testRuntimeOnly 'org.junit.platform:junit-platform-launcher'
	testRuntimeOnly 'com.h2database:h2'
}

tasks.named('test') {
	useJUnitPlatform()
}
```

### FILE: backend-java/db/booking_hardening.sql
```sql
-- Hardening de reservas:
-- 1) Evita doble booking por profesional+fecha_hora (concurrencia).
-- 2) Agrega flags de actividad para profesional/servicio.
BEGIN;

ALTER TABLE professional_profile
    ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

ALTER TABLE professional_service
    ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

UPDATE professional_profile
SET active = true
WHERE active IS NULL;

UPDATE professional_service
SET active = true
WHERE active IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_professional_start
    ON booking (professional_id, start_date_time);

DROP INDEX IF EXISTS idx_booking_professional_start;

COMMIT;
```

### FILE: backend-java/db/business_photo.sql
```sql
BEGIN;

CREATE TABLE IF NOT EXISTS business_photo (
  id bigserial PRIMARY KEY,
  professional_id bigint NOT NULL REFERENCES professional_profile(id) ON DELETE CASCADE,
  url varchar(500) NOT NULL,
  type varchar(20) NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT chk_business_photo_type CHECK (type IN ('LOCAL', 'SERVICE', 'WORK'))
);

CREATE INDEX IF NOT EXISTS idx_business_photo_professional_type_created
  ON business_photo (professional_id, type, created_at);

COMMIT;
```

### FILE: backend-java/db/functional_integrity_audit.sql
```sql
-- Functional integrity audit (dashboard profesional -> DB -> pagina publica)
-- Usage (psql):
--   \set slug 'tu-slug-profesional'
--   \i backend-java/db/functional_integrity_audit.sql

\echo '== Profesional objetivo =='
SELECT
  p.id,
  p.slug,
  p.active,
  p.rubro,
  p.location,
  p.public_headline,
  p.public_about,
  u.full_name,
  u.phone_number
FROM professional_profile p
JOIN app_user u ON u.id = p.user_id
WHERE p.slug = :'slug';

\echo '== Servicios (DB real) =='
SELECT
  s.id,
  s.name,
  s.price,
  s.duration,
  s.active,
  s.created_at
FROM professional_service s
JOIN professional_profile p ON p.id = s.professional_id
WHERE p.slug = :'slug'
ORDER BY s.created_at DESC;

\echo '== Servicios visibles en pagina publica (solo activos) =='
SELECT
  s.id,
  s.name,
  s.price,
  s.duration
FROM professional_service s
JOIN professional_profile p ON p.id = s.professional_id
WHERE p.slug = :'slug'
  AND COALESCE(s.active, true) = true
ORDER BY s.created_at DESC;

\echo '== Schedule JSON en DB =='
SELECT
  p.id,
  p.slug,
  p.schedule_json,
  CASE
    WHEN p.schedule_json IS NULL OR btrim(p.schedule_json) = '' THEN false
    ELSE jsonb_typeof(p.schedule_json::jsonb -> 'days') = 'array'
  END AS has_days_array,
  CASE
    WHEN p.schedule_json IS NULL OR btrim(p.schedule_json) = '' THEN 0
    ELSE jsonb_array_length(COALESCE(p.schedule_json::jsonb -> 'days', '[]'::jsonb))
  END AS days_count
FROM professional_profile p
WHERE p.slug = :'slug';

\echo '== Duplicados de day en schedule_json (debe devolver 0 filas) =='
WITH days AS (
  SELECT
    p.slug,
    lower(COALESCE(day_item->>'day', '')) AS day_key
  FROM professional_profile p
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.schedule_json::jsonb -> 'days', '[]'::jsonb)) AS day_item
  WHERE p.slug = :'slug'
)
SELECT slug, day_key, count(*) AS duplicates
FROM days
WHERE day_key <> ''
GROUP BY slug, day_key
HAVING count(*) > 1;

\echo '== Reservas del profesional =='
SELECT
  b.id,
  b.start_date_time,
  b.status,
  s.id AS service_id,
  s.name AS service_name,
  s.active AS service_active,
  u.id AS client_id,
  u.full_name AS client_name
FROM booking b
JOIN professional_profile p ON p.id = b.professional_id
JOIN professional_service s ON s.id = b.service_id
JOIN app_user u ON u.id = b.user_id
WHERE p.slug = :'slug'
ORDER BY b.start_date_time DESC;

\echo '== Inconsistencias: reservas contra servicio/profesional inactivo =='
SELECT
  b.id,
  b.status,
  b.start_date_time,
  p.slug,
  p.active AS professional_active,
  s.active AS service_active
FROM booking b
JOIN professional_profile p ON p.id = b.professional_id
JOIN professional_service s ON s.id = b.service_id
WHERE p.slug = :'slug'
  AND (
    COALESCE(p.active, true) = false
    OR COALESCE(s.active, true) = false
  )
ORDER BY b.start_date_time DESC;

\echo '== Integridad global: tabla legacy profesional_service (debe estar vacia) =='
SELECT count(*) AS legacy_profesional_service_rows
FROM profesional_service;
```

### FILE: backend-java/db/functional_integrity_checklist.md
```markdown
# Checklist de Integridad Funcional

Objetivo: validar que lo configurado por el profesional en dashboard se persiste en DB y se refleja en la API/página pública.

## 1) Servicios

1. Crear servicio en dashboard profesional.
2. Verificar DB:
   - `SELECT id, name, price, duration, active FROM professional_service WHERE professional_id = <ID> ORDER BY created_at DESC;`
3. Verificar API pública:
   - `GET /public/profesionales/{slug}`
   - Debe listar solo servicios con `active = true`.
4. Editar servicio y repetir verificación DB/API.
5. Desactivar servicio y verificar que desaparece de API pública.
6. Eliminar servicio y verificar que no aparece en DB/API.

## 2) Horarios

1. Guardar horario desde `/profesional/dashboard/horarios`.
2. Verificar DB:
   - `SELECT schedule_json FROM professional_profile WHERE id = <ID>;`
3. Verificar API pública:
   - `GET /public/profesionales/{slug}`
   - `schedule` debe reflejar el JSON normalizado.
4. Verificar slots:
   - `GET /public/profesionales/{slug}/slots?date=YYYY-MM-DD&serviceId=<serviceId>`
   - Deben respetar días/rangos configurados.

## 3) Perfil público

1. Actualizar nombre, rubro, ubicación y teléfono en `/profesional/dashboard/perfil-negocio`.
2. Actualizar headline/about/photos en `/profesional/dashboard/pagina-publica`.
3. Verificar DB:
   - `professional_profile`: `rubro`, `location`, `public_headline`, `public_about`.
   - `professional_profile_photos`: fotos públicas.
   - `app_user`: `full_name`, `phone_number`.
4. Verificar API pública:
   - `GET /public/profesionales/{slug}` debe reflejar esos datos.

## 4) Reservas y estados

1. Cliente crea reserva.
2. Profesional confirma (`PENDING -> CONFIRMED`).
3. Profesional completa (`CONFIRMED -> COMPLETED`).
4. Verificar DB:
   - `SELECT id, status, start_date_time FROM booking WHERE id = <bookingId>;`
5. Verificar dashboard cliente:
   - `/cliente/reservas` y próxima reserva.

## 5) Inconsistencias críticas

1. Reservas apuntando a servicio/profesional inactivo.
2. Servicios activos que no aparecen en API pública.
3. `schedule_json` inválido o sin 7 días normalizados.
4. Datos del perfil visibles en UI pero no persistidos en DB.

## Ejecución rápida

1. SQL completo:
   - `\set slug 'tu-slug'`
   - `\i backend-java/db/functional_integrity_audit.sql`
2. Script automatizado DB/API:
   - `backend-java/scripts/audit_public_consistency.sh tu-slug`
```

### FILE: backend-java/db/oauth_user_columns.sql
```sql
-- OAuth columns for app_user (Google/Apple login support).
-- Safe to run multiple times.

ALTER TABLE app_user
    ADD COLUMN IF NOT EXISTS provider varchar(20);

ALTER TABLE app_user
    ADD COLUMN IF NOT EXISTS provider_id varchar(255);

ALTER TABLE app_user
    ADD COLUMN IF NOT EXISTS avatar varchar(500);

CREATE INDEX IF NOT EXISTS idx_app_user_provider
    ON app_user (provider);

CREATE INDEX IF NOT EXISTS idx_app_user_provider_id
    ON app_user (provider_id);

CREATE UNIQUE INDEX IF NOT EXISTS uk_app_user_provider_provider_id
    ON app_user (provider, provider_id)
    WHERE provider IS NOT NULL AND provider_id IS NOT NULL;
```

### FILE: backend-java/db/performance_indexes.sql
```sql
-- Performance indexes for search, home, and availability queries

-- professional_service: used by search subqueries and public page mapping
CREATE INDEX IF NOT EXISTS idx_professional_service_professional_active
    ON professional_service (professional_id, active);

-- booking: used by findTopProfessionalIdsByStatuses (home page)
CREATE INDEX IF NOT EXISTS idx_booking_status
    ON booking (status);

-- booking: used by countMonthlyBookings (home page stats)
CREATE INDEX IF NOT EXISTS idx_booking_created_at_status
    ON booking (created_at, status);

-- available_slot: used by search date_match and available_now_match
CREATE INDEX IF NOT EXISTS idx_available_slot_prof_status_start
    ON available_slot (professional_id, status, start_at);

-- professional_categories: used by search category filtering and aggregation
CREATE INDEX IF NOT EXISTS idx_professional_categories_professional
    ON professional_categories (professional_id);

-- professional_profile_photos: used by cover image lookup in search
CREATE INDEX IF NOT EXISTS idx_professional_profile_photos_prof_position
    ON professional_profile_photos (professional_id, position);

-- professional_profile: used by search and listing active profiles
CREATE INDEX IF NOT EXISTS idx_professional_profile_active_created
    ON professional_profile (active, created_at DESC);
```

### FILE: backend-java/db/phase2_critical_indexes_2026_03_05.sql
```sql
-- Phase 2: critical indexes for booking/auth/search hardening.
-- Safe to run multiple times.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION immutable_unaccent(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT unaccent('unaccent', COALESCE(value, ''));
$$;

CREATE INDEX IF NOT EXISTS idx_booking_user_status_date
ON booking (user_id, status, start_date_time);

CREATE INDEX IF NOT EXISTS idx_booking_professional_date_status
ON booking (professional_id, start_date_time, status);

CREATE INDEX IF NOT EXISTS idx_service_name_trgm
ON professional_service
USING gin (immutable_unaccent(lower(name)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_refresh_token_expiry
ON auth_refresh_token (expiry_date);

CREATE INDEX IF NOT EXISTS idx_user_role
ON app_user (role);
```

### FILE: backend-java/db/phase3_cache_availability_2026_03_05.sql
```sql
-- Phase 3 cache/performance foundation

ALTER TABLE professional_profile
  ADD COLUMN IF NOT EXISTS has_availability_today boolean NOT NULL DEFAULT false;

-- Backfill inicial desde available_slot para el día actual.
UPDATE professional_profile profile
SET has_availability_today = EXISTS (
  SELECT 1
  FROM available_slot slot
  WHERE slot.professional_id = profile.id
    AND slot.status = 'AVAILABLE'
    AND slot.start_at >= date_trunc('day', now())
    AND slot.start_at < date_trunc('day', now()) + interval '1 day'
);

CREATE INDEX IF NOT EXISTS idx_professional_profile_has_availability_today
  ON professional_profile (has_availability_today);
```

### FILE: backend-java/db/phase4_schedule_summary_2026_03_05.sql
```sql
-- Phase 4 availability summary foundation

ALTER TABLE professional_profile
  ADD COLUMN IF NOT EXISTS next_available_at timestamp NULL;

-- Backfill inicial en base a available_slot para no arrancar en NULL masivo.
WITH next_slots AS (
    SELECT s.professional_id,
           MIN(s.start_at) AS next_start
    FROM available_slot s
    WHERE s.status = 'AVAILABLE'
      AND s.start_at >= now()
      AND s.start_at < now() + interval '14 day'
    GROUP BY s.professional_id
)
UPDATE professional_profile p
SET next_available_at = n.next_start
FROM next_slots n
WHERE p.id = n.professional_id;

CREATE INDEX IF NOT EXISTS idx_professional_profile_next_available_at
  ON professional_profile (next_available_at);
```

### FILE: backend-java/db/professional_coordinates.sql
```sql
ALTER TABLE professional_profile
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

UPDATE professional_profile
SET latitude = ST_Y(geom::geometry),
    longitude = ST_X(geom::geometry)
WHERE geom IS NOT NULL
  AND (latitude IS NULL OR longitude IS NULL);

UPDATE professional_profile
SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE geom IS NULL
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prof_lat_lng
  ON professional_profile(latitude, longitude);

```

### FILE: backend-java/db/refresh_token_unify_user.sql
```sql
-- Unifica auth_refresh_token para el modelo de usuario único (app_user).
-- Esquema objetivo:
-- id, user_id, token, expiry_date, revoked
BEGIN;

ALTER TABLE auth_refresh_token
DROP COLUMN IF EXISTS user_type;
ALTER TABLE auth_refresh_token
DROP COLUMN IF EXISTS replaced_by;
ALTER TABLE auth_refresh_token
DROP COLUMN IF EXISTS user_agent;
ALTER TABLE auth_refresh_token
DROP COLUMN IF EXISTS created_at;

DO $$
DECLARE
    user_id_data_type text;
BEGIN
    SELECT data_type
    INTO user_id_data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'auth_refresh_token'
      AND column_name = 'user_id';

    IF user_id_data_type IS DISTINCT FROM 'bigint' THEN
        -- Tokens legacy con UUID quedan inválidos para el modelo actual.
        DELETE FROM auth_refresh_token WHERE user_id !~ '^[0-9]+$';

        ALTER TABLE auth_refresh_token
            ALTER COLUMN user_id TYPE bigint
            USING user_id::bigint;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'auth_refresh_token'
          AND column_name = 'token_hash'
    ) THEN
        ALTER TABLE auth_refresh_token RENAME COLUMN token_hash TO token;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'auth_refresh_token'
          AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE auth_refresh_token RENAME COLUMN expires_at TO expiry_date;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'auth_refresh_token'
          AND column_name = 'revoked_at'
    ) THEN
        ALTER TABLE auth_refresh_token RENAME COLUMN revoked_at TO revoked;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_token_hash ON auth_refresh_token(token);
CREATE INDEX IF NOT EXISTS idx_refresh_token_user ON auth_refresh_token(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_token_expires ON auth_refresh_token(expiry_date);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_auth_refresh_token_user'
    ) THEN
        ALTER TABLE auth_refresh_token
            ADD CONSTRAINT fk_auth_refresh_token_user
            FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE CASCADE;
    END IF;
END $$;

COMMIT;
```

### FILE: backend-java/db/rename_user_tables.sql
```sql
-- Normaliza los nombres de tablas a snake_case y conserva las tablas antiguas como backup.
-- user_normal/user_cliente (legacy) se renombran con sufijo _legacy.
-- "UserNormal" -> user_cliente
-- "UserCliente" -> user_profesional
BEGIN;

ALTER TABLE IF EXISTS user_cliente RENAME TO user_cliente_legacy;
ALTER TABLE IF EXISTS user_normal RENAME TO user_normal_legacy;

ALTER TABLE IF EXISTS "UserNormal" RENAME TO user_cliente;
ALTER TABLE IF EXISTS "UserCliente" RENAME TO user_profesional;

COMMIT;
```

### FILE: backend-java/db/search_scale_foundation.sql
```sql
-- Search foundation for real-scale traffic (PostgreSQL + PostGIS + trigram).

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION immutable_unaccent(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT unaccent('unaccent', COALESCE(value, ''));
$$;

ALTER TABLE professional_profile
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS location_text text,
  ADD COLUMN IF NOT EXISTS geom geography(Point, 4326),
  ADD COLUMN IF NOT EXISTS rating numeric(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviews_count integer NOT NULL DEFAULT 0;

UPDATE professional_profile profile
SET display_name = users.full_name
FROM app_user users
WHERE profile.user_id = users.id
  AND (profile.display_name IS NULL OR btrim(profile.display_name) = '');

UPDATE professional_profile
SET location_text = location
WHERE (location_text IS NULL OR btrim(location_text) = '')
  AND location IS NOT NULL;

CREATE OR REPLACE FUNCTION sync_prof_display_name_from_user()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE professional_profile
  SET display_name = NEW.full_name
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_prof_display_name ON app_user;
CREATE TRIGGER trg_sync_prof_display_name
AFTER INSERT OR UPDATE OF full_name ON app_user
FOR EACH ROW
EXECUTE FUNCTION sync_prof_display_name_from_user();

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  image_url text,
  display_order integer,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS professional_categories (
  professional_id bigint NOT NULL REFERENCES professional_profile(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (professional_id, category_id)
);

CREATE TABLE IF NOT EXISTS available_slot (
  id bigserial PRIMARY KEY,
  professional_id bigint NOT NULL REFERENCES professional_profile(id) ON DELETE CASCADE,
  start_at timestamp NOT NULL,
  end_at timestamp NOT NULL,
  status varchar(20) NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT chk_available_slot_status CHECK (status IN ('AVAILABLE', 'BOOKED')),
  CONSTRAINT uq_available_slot_professional_start UNIQUE (professional_id, start_at)
);

CREATE TABLE IF NOT EXISTS geo_location_seed (
  id bigserial PRIMARY KEY,
  label text NOT NULL,
  city text NOT NULL,
  lat double precision,
  lng double precision,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uq_geo_location_seed_label_city UNIQUE (label, city)
);

INSERT INTO geo_location_seed (label, city, lat, lng, active)
VALUES
  ('Centro', 'Montevideo', -34.9053, -56.1892, true),
  ('Pocitos', 'Montevideo', -34.9190, -56.1518, true),
  ('Carrasco', 'Montevideo', -34.8871, -56.0606, true),
  ('Cordón', 'Montevideo', -34.9058, -56.1815, true),
  ('Parque Rodó', 'Montevideo', -34.9147, -56.1675, true),
  ('Centro', 'Maldonado', -34.9058, -54.9597, true),
  ('Punta del Este', 'Maldonado', -34.9683, -54.9431, true),
  ('La Barra', 'Maldonado', -34.9028, -54.7857, true),
  ('Centro', 'Canelones', -34.5228, -56.2778, true),
  ('Ciudad de la Costa', 'Canelones', -34.8167, -55.9500, true),
  ('Centro', 'Colonia', -34.4714, -57.8442, true),
  ('Centro', 'Salto', -31.3833, -57.9667, true),
  ('Centro', 'Paysandú', -32.3214, -58.0756, true),
  ('Palermo', 'Buenos Aires', -34.5875, -58.4200, true),
  ('Recoleta', 'Buenos Aires', -34.5889, -58.3974, true),
  ('Belgrano', 'Buenos Aires', -34.5620, -58.4565, true)
ON CONFLICT (label, city) DO UPDATE
SET lat = EXCLUDED.lat,
    lng = EXCLUDED.lng,
    active = EXCLUDED.active;

CREATE INDEX IF NOT EXISTS idx_prof_geom
ON professional_profile USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_prof_name_trgm
ON professional_profile USING GIN (immutable_unaccent(lower(display_name)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_service_name_trgm
ON professional_service USING GIN (immutable_unaccent(lower(name)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_prof_active
ON professional_profile(active);

CREATE INDEX IF NOT EXISTS idx_prof_category
ON professional_categories(category_id, professional_id);

CREATE INDEX IF NOT EXISTS idx_booking_prof_start
ON booking(professional_id, start_date_time);

CREATE INDEX IF NOT EXISTS idx_available_slot_prof_start
ON available_slot(professional_id, start_at);

CREATE INDEX IF NOT EXISTS idx_available_slot_start
ON available_slot(start_at);

CREATE INDEX IF NOT EXISTS idx_geo_seed_label_trgm
ON geo_location_seed USING GIN (immutable_unaccent(lower(label)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_geo_seed_city_trgm
ON geo_location_seed USING GIN (immutable_unaccent(lower(city)) gin_trgm_ops);
```

### FILE: backend-java/db/service_description_image.sql
```sql
BEGIN;

ALTER TABLE professional_service
  ADD COLUMN IF NOT EXISTS description varchar(200),
  ADD COLUMN IF NOT EXISTS image_url varchar(500);

COMMIT;
```

### FILE: backend-java/db/service_post_buffer_minutes.sql
```sql
ALTER TABLE professional_service
  ADD COLUMN IF NOT EXISTS post_buffer_minutes integer;

UPDATE professional_service
SET post_buffer_minutes = 0
WHERE post_buffer_minutes IS NULL OR post_buffer_minutes < 0;

ALTER TABLE professional_service
  ALTER COLUMN post_buffer_minutes SET DEFAULT 0,
  ALTER COLUMN post_buffer_minutes SET NOT NULL;
```

### FILE: backend-java/db/slot_duration_minutes.sql
```sql
ALTER TABLE professional_profile
  ADD COLUMN IF NOT EXISTS slot_duration_minutes integer;

UPDATE professional_profile
SET slot_duration_minutes = 15
WHERE slot_duration_minutes IS NULL;

ALTER TABLE professional_profile
  ALTER COLUMN slot_duration_minutes SET DEFAULT 15,
  ALTER COLUMN slot_duration_minutes SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_prof_slot_duration_minutes'
  ) THEN
    ALTER TABLE professional_profile
      ADD CONSTRAINT chk_prof_slot_duration_minutes
      CHECK (slot_duration_minutes IN (10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60));
  END IF;
END $$;
```

### FILE: backend-java/settings.gradle
```groovy
rootProject.name = 'plura-backend'
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/PluraBackendApplication.java
```java
package com.plura.plurabackend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import io.github.cdimascio.dotenv.Dotenv;

@SpringBootApplication
@EnableScheduling
@EnableAsync
public class PluraBackendApplication {

	public static void main(String[] args) {
		// Carga variables desde .env para entornos locales.
		Dotenv dotenv = Dotenv.configure().ignoreIfMissing().load();
		dotenv.entries().forEach(entry -> System.setProperty(entry.getKey(), entry.getValue()));
		SpringApplication.run(PluraBackendApplication.class, args);
	}

}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/auth/AuthController.java
```java
package com.plura.plurabackend.auth;

import com.plura.plurabackend.auth.dto.LoginRequest;
import com.plura.plurabackend.auth.dto.ProfesionalProfileResponse;
import com.plura.plurabackend.auth.dto.RegisterProfesionalRequest;
import com.plura.plurabackend.auth.dto.RegisterRequest;
import com.plura.plurabackend.auth.dto.RegisterResponse;
import com.plura.plurabackend.auth.dto.UserResponse;
import com.plura.plurabackend.auth.oauth.dto.OAuthLoginRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private static final String ACCESS_COOKIE = "plura_access_token";
    private static final String REFRESH_COOKIE = "plura_refresh_token";

    private final AuthService authService;

    @Value("${jwt.expiration-minutes:30}")
    private long accessTokenMinutes;

    @Value("${jwt.refresh-days:30}")
    private long refreshTokenDays;

    @Value("${app.auth.cookie-secure:false}")
    private boolean cookieSecure;

    @Value("${app.auth.cookie-same-site:Lax}")
    private String cookieSameSite;

    // Constructor injection to keep the controller immutable and testable.
    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // Registro de clientes (alias /register).
    @PostMapping({"/register", "/register/cliente"})
    public ResponseEntity<RegisterResponse> registerCliente(
        @Valid @RequestBody RegisterRequest request,
        HttpServletRequest httpRequest
    ) {
        AuthService.AuthResult result = authService.registerCliente(request, httpRequest.getHeader("User-Agent"));
        return buildAuthResponse(result);
    }

    // Registro de profesionales con campos específicos.
    @PostMapping("/register/profesional")
    public ResponseEntity<RegisterResponse> registerProfesional(
        @Valid @RequestBody RegisterProfesionalRequest request,
        HttpServletRequest httpRequest
    ) {
        AuthService.AuthResult result = authService.registerProfesional(request, httpRequest.getHeader("User-Agent"));
        return buildAuthResponse(result);
    }

    @PostMapping({"/login", "/login/cliente"})
    public ResponseEntity<RegisterResponse> loginCliente(
        @Valid @RequestBody LoginRequest request,
        HttpServletRequest httpRequest
    ) {
        AuthService.AuthResult result = authService.loginCliente(request, httpRequest.getHeader("User-Agent"));
        return buildAuthResponse(result);
    }

    @PostMapping("/login/profesional")
    public ResponseEntity<RegisterResponse> loginProfesional(
        @Valid @RequestBody LoginRequest request,
        HttpServletRequest httpRequest
    ) {
        AuthService.AuthResult result = authService.loginProfesional(request, httpRequest.getHeader("User-Agent"));
        return buildAuthResponse(result);
    }

    @PostMapping("/oauth")
    public ResponseEntity<RegisterResponse> loginWithOAuth(
        @Valid @RequestBody OAuthLoginRequest request,
        HttpServletRequest httpRequest
    ) {
        AuthService.AuthResult result = authService.loginWithOAuth(
            request.getProvider(),
            request.getToken(),
            httpRequest.getHeader("User-Agent")
        );
        return buildAuthResponse(result);
    }

    @PostMapping("/refresh")
    public ResponseEntity<RegisterResponse> refreshSession(
        @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken,
        HttpServletRequest httpRequest
    ) {
        AuthService.AuthResult result = authService.refreshSession(refreshToken, httpRequest.getHeader("User-Agent"));
        return buildAuthResponse(result);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
        @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken
    ) {
        authService.logout(refreshToken);
        return ResponseEntity.noContent()
            .header(HttpHeaders.SET_COOKIE, clearCookie(ACCESS_COOKIE, "/").toString())
            .header(HttpHeaders.SET_COOKIE, clearCookie(REFRESH_COOKIE, "/auth").toString())
            .build();
    }

    @GetMapping({"/me/profesional", "/me/professional"})
    public ProfesionalProfileResponse getProfesionalProfile() {
        Authentication authentication = requireAuthentication();
        requireRole(authentication, "ROLE_PROFESSIONAL");
        String profesionalId = authentication.getPrincipal().toString();
        return authService.getProfesionalProfile(profesionalId);
    }

    @GetMapping("/me/cliente")
    public UserResponse getClienteProfile() {
        Authentication authentication = requireAuthentication();
        requireRole(authentication, "ROLE_USER");
        String clienteId = authentication.getPrincipal().toString();
        return authService.getClienteProfile(clienteId);
    }

    private ResponseEntity<RegisterResponse> buildAuthResponse(AuthService.AuthResult result) {
        ResponseCookie accessCookie = buildAccessCookie(result.accessToken());
        ResponseCookie refreshCookie = buildRefreshCookie(result.refreshToken());
        
        // Pasamos result.accessToken() en lugar de null
        RegisterResponse payload = new RegisterResponse(result.accessToken(), result.user());

        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, accessCookie.toString())
            .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
            .body(payload);
    }

    private ResponseCookie buildAccessCookie(String token) {
        return ResponseCookie.from(ACCESS_COOKIE, token)
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite(cookieSameSite)
            .path("/")
            .maxAge(Duration.ofMinutes(accessTokenMinutes))
            .build();
    }

    private ResponseCookie buildRefreshCookie(String token) {
        return ResponseCookie.from(REFRESH_COOKIE, token)
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite(cookieSameSite)
            .path("/auth")
            .maxAge(Duration.ofDays(refreshTokenDays))
            .build();
    }

    private ResponseCookie clearCookie(String name, String path) {
        return ResponseCookie.from(name, "")
            .httpOnly(true)
            .secure(cookieSecure)
            .sameSite(cookieSameSite)
            .path(path)
            .maxAge(0)
            .build();
    }

    private Authentication requireAuthentication() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (
            authentication == null
                || !authentication.isAuthenticated()
                || authentication.getPrincipal() == null
                || authentication instanceof AnonymousAuthenticationToken
        ) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No autenticado");
        }
        return authentication;
    }

    private void requireRole(Authentication authentication, String role) {
        if (authentication.getAuthorities().stream().noneMatch(
            authority -> authority.equals(new SimpleGrantedAuthority(role))
        )) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acceso denegado");
        }
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/auth/AuthService.java
```java
package com.plura.plurabackend.auth;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.plura.plurabackend.auth.dto.LoginRequest;
import com.plura.plurabackend.auth.dto.ProfesionalProfileResponse;
import com.plura.plurabackend.auth.dto.RegisterProfesionalRequest;
import com.plura.plurabackend.auth.dto.RegisterRequest;
import com.plura.plurabackend.auth.dto.UserResponse;
import com.plura.plurabackend.auth.oauth.OAuthService;
import com.plura.plurabackend.auth.oauth.OAuthUserInfo;
import com.plura.plurabackend.category.dto.CategoryResponse;
import com.plura.plurabackend.category.model.Category;
import com.plura.plurabackend.category.repository.CategoryRepository;
import com.plura.plurabackend.auth.model.RefreshToken;
import com.plura.plurabackend.auth.repository.RefreshTokenRepository;
import com.plura.plurabackend.common.util.SlugUtils;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import com.plura.plurabackend.search.engine.SearchSyncPublisher;
import com.plura.plurabackend.user.model.User;
import com.plura.plurabackend.user.model.UserRole;
import com.plura.plurabackend.user.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Comparator;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final ProfessionalProfileRepository professionalProfileRepository;
    private final CategoryRepository categoryRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final OAuthService oAuthService;
    private final SearchSyncPublisher searchSyncPublisher;
    private final PasswordEncoder passwordEncoder;
    private final Algorithm jwtAlgorithm;
    private final long jwtExpirationMinutes;
    private final long refreshTokenDays;
    private final String refreshTokenPepper;
    private final String jwtIssuer;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final Map<String, String> LEGACY_CATEGORY_ALIASES = Map.ofEntries(
        Map.entry("peluqueria", "cabello"),
        Map.entry("cejas", "pestanas-cejas"),
        Map.entry("pestanas", "pestanas-cejas"),
        Map.entry("faciales", "estetica-facial"),
        Map.entry("tratamientos-corporales", "tratamientos-corporales"),
        Map.entry("medicina-estetica", "medicina-estetica"),
        Map.entry("bienestar-holistico", "bienestar-holistico")
    );

    public AuthService(
        UserRepository userRepository,
        ProfessionalProfileRepository professionalProfileRepository,
        CategoryRepository categoryRepository,
        RefreshTokenRepository refreshTokenRepository,
        OAuthService oAuthService,
        SearchSyncPublisher searchSyncPublisher,
        PasswordEncoder passwordEncoder,
        @Value("${jwt.secret}") String jwtSecret,
        @Value("${jwt.expiration-minutes:30}") long jwtExpirationMinutes,
        @Value("${jwt.refresh-days:30}") long refreshTokenDays,
        @Value("${jwt.refresh-pepper}") String refreshTokenPepper,
        @Value("${jwt.issuer:plura}") String jwtIssuer
    ) {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET no está configurado");
        }
        if (refreshTokenPepper == null || refreshTokenPepper.isBlank()) {
            throw new IllegalStateException("JWT_REFRESH_PEPPER no está configurado");
        }
        this.userRepository = userRepository;
        this.professionalProfileRepository = professionalProfileRepository;
        this.categoryRepository = categoryRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.oAuthService = oAuthService;
        this.searchSyncPublisher = searchSyncPublisher;
        this.passwordEncoder = passwordEncoder;
        this.jwtAlgorithm = Algorithm.HMAC256(jwtSecret);
        this.jwtExpirationMinutes = jwtExpirationMinutes;
        this.refreshTokenDays = refreshTokenDays;
        this.refreshTokenPepper = refreshTokenPepper;
        this.jwtIssuer = jwtIssuer;
    }

    public record AuthResult(
        String accessToken,
        String refreshToken,
        UserResponse user,
        UserRole role
    ) {}

    private record RefreshTokenIssue(String rawToken, RefreshToken entity) {}

    @Transactional
    public AuthResult registerCliente(RegisterRequest request, String userAgent) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No se pudo crear la cuenta");
        }

        User user = new User();
        user.setFullName(request.getFullName().trim());
        user.setEmail(request.getEmail().trim().toLowerCase());
        user.setPhoneNumber(request.getPhoneNumber().trim());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(UserRole.USER);

        User saved = userRepository.save(user);
        UserResponse userResponse = toUserResponse(saved);
        return issueTokens(saved, userResponse, userAgent);
    }

    @Transactional
    public AuthResult registerProfesional(RegisterProfesionalRequest request, String userAgent) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No se pudo crear la cuenta");
        }

        String tipoCliente = normalizeTipoCliente(request.getTipoCliente());
        String location = normalizeLocation(request.getLocation());
        Double latitude = normalizeLatitude(request.getLatitude());
        Double longitude = normalizeLongitude(request.getLongitude());
        validateCoordinatesPair(latitude, longitude);

        if (!"SIN_LOCAL".equals(tipoCliente) && (location == null || location.isBlank())) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "La ubicación es obligatoria para locales o profesionales con local propio"
            );
        }
        if (!"SIN_LOCAL".equals(tipoCliente) && (latitude == null || longitude == null)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "No se pudo geocodificar la ubicación"
            );
        }
        if ("SIN_LOCAL".equals(tipoCliente)) {
            latitude = null;
            longitude = null;
        }

        User user = new User();
        user.setFullName(request.getFullName().trim());
        user.setEmail(request.getEmail().trim().toLowerCase());
        user.setPhoneNumber(request.getPhoneNumber().trim());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(UserRole.PROFESSIONAL);
        User savedUser = userRepository.save(user);

        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setUser(savedUser);
        Set<Category> categories = resolveCategoriesForRegistration(request);
        profile.setCategories(categories);
        profile.setRubro(resolvePrimaryCategoryName(categories, request.getRubro()));
        profile.setDisplayName(savedUser.getFullName());
        profile.setSlug(
            SlugUtils.generateUniqueSlug(
                savedUser.getFullName(),
                professionalProfileRepository::existsBySlug
            )
        );
        profile.setLocation("SIN_LOCAL".equals(tipoCliente) ? null : location);
        profile.setLocationText("SIN_LOCAL".equals(tipoCliente) ? null : location);
        profile.setLatitude(latitude);
        profile.setLongitude(longitude);
        profile.setTipoCliente(tipoCliente);
        profile = professionalProfileRepository.save(profile);
        professionalProfileRepository.updateCoordinates(profile.getId(), latitude, longitude);
        searchSyncPublisher.publishProfileChanged(profile.getId());

        UserResponse userResponse = toUserResponse(savedUser);
        return issueTokens(savedUser, userResponse, userAgent);
    }

    public AuthResult loginProfesional(LoginRequest request, String userAgent) {
        User user = userRepository.findByEmail(request.getEmail().trim().toLowerCase())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas"));

        if (user.getRole() != UserRole.PROFESSIONAL) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
        }

        return issueTokens(user, toUserResponse(user), userAgent);
    }

    public AuthResult loginCliente(LoginRequest request, String userAgent) {
        User user = userRepository.findByEmail(request.getEmail().trim().toLowerCase())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas"));

        if (user.getRole() != UserRole.USER) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciales inválidas");
        }

        return issueTokens(user, toUserResponse(user), userAgent);
    }

    @Transactional
    public AuthResult loginWithOAuth(String provider, String token, String userAgent) {
        OAuthUserInfo userInfo = oAuthService.verify(provider, token);
        String normalizedProvider = normalizeOAuthProvider(userInfo.provider());
        String providerId = normalizeOAuthValue(userInfo.providerId());
        String email = normalizeOAuthEmail(userInfo.email());

        if (providerId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token OAuth sin providerId");
        }

        User user = null;
        if (email != null) {
            user = userRepository.findByEmail(email).orElse(null);
        }
        if (user == null) {
            user = userRepository.findByProviderAndProviderId(normalizedProvider, providerId).orElse(null);
        }

        if (user == null) {
            user = new User();
            user.setRole(UserRole.USER);
            user.setEmail(email != null ? email : buildSyntheticOAuthEmail(normalizedProvider, providerId));
            user.setPassword(passwordEncoder.encode(generateRefreshToken()));
            user.setFullName(resolveOAuthDisplayName(userInfo.name(), user.getEmail()));
            user.setProvider(normalizedProvider);
            user.setProviderId(providerId);
            user.setAvatar(normalizeOAuthValue(userInfo.avatar()));
            user = userRepository.save(user);
        } else {
            boolean changed = false;
            if ((user.getProvider() == null || user.getProvider().isBlank()) || normalizedProvider.equals(user.getProvider())) {
                if (!normalizedProvider.equals(user.getProvider())) {
                    user.setProvider(normalizedProvider);
                    changed = true;
                }
                if (!providerId.equals(user.getProviderId())) {
                    user.setProviderId(providerId);
                    changed = true;
                }
            }
            String avatar = normalizeOAuthValue(userInfo.avatar());
            if (avatar != null && !avatar.equals(user.getAvatar())) {
                user.setAvatar(avatar);
                changed = true;
            }
            if (changed) {
                user = userRepository.save(user);
            }
        }

        return issueTokens(user, toUserResponse(user), userAgent);
    }

    @Transactional
    public AuthResult refreshSession(String refreshToken, String userAgent) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token faltante");
        }

        String tokenHash = hashToken(refreshToken);
        RefreshToken stored = refreshTokenRepository.findByToken(tokenHash)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token inválido"));

        if (stored.getRevokedAt() != null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token revocado");
        }

        LocalDateTime now = LocalDateTime.now();
        if (stored.getExpiryDate().isBefore(now)) {
            stored.setRevokedAt(now);
            refreshTokenRepository.save(stored);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token expirado");
        }

        User user = stored.getUser();

        stored.setRevokedAt(now);
        refreshTokenRepository.save(stored);
        RefreshTokenIssue replacement = createRefreshToken(user);

        String accessToken = createAccessToken(
            String.valueOf(user.getId()),
            user.getEmail(),
            user.getRole()
        );

        return new AuthResult(accessToken, replacement.rawToken(), toUserResponse(user), user.getRole());
    }

    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        String tokenHash = hashToken(refreshToken);
        refreshTokenRepository.findByToken(tokenHash).ifPresent(stored -> {
            if (stored.getRevokedAt() == null) {
                stored.setRevokedAt(LocalDateTime.now());
                refreshTokenRepository.save(stored);
            }
        });
    }

    private AuthResult issueTokens(User user, UserResponse userResponse, String userAgent) {
        String userId = String.valueOf(user.getId());
        String accessToken = createAccessToken(userId, user.getEmail(), user.getRole());
        RefreshTokenIssue refreshToken = createRefreshToken(user);
        return new AuthResult(accessToken, refreshToken.rawToken(), userResponse, user.getRole());
    }

    private String createAccessToken(String userId, String email, UserRole role) {
        Date now = new Date();
        Date expiresAt = Date.from(Instant.now().plus(jwtExpirationMinutes, ChronoUnit.MINUTES));
        return JWT.create()
            .withSubject(userId)
            .withClaim("email", email)
            .withClaim("role", role.name())
            .withIssuer(jwtIssuer)
            .withIssuedAt(now)
            .withExpiresAt(expiresAt)
            .sign(jwtAlgorithm);
    }

    private RefreshTokenIssue createRefreshToken(User user) {
        String rawToken = generateRefreshToken();
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setToken(hashToken(rawToken));
        refreshToken.setExpiryDate(LocalDateTime.now().plusDays(refreshTokenDays));
        RefreshToken saved = refreshTokenRepository.save(refreshToken);
        return new RefreshTokenIssue(rawToken, saved);
    }

    private String generateRefreshToken() {
        byte[] randomBytes = new byte[64];
        SECURE_RANDOM.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String value = rawToken + refreshTokenPepper;
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("No se pudo hashear el refresh token", ex);
        }
    }

    private User loadUserByRawId(String rawUserId) {
        Long userId;
        try {
            userId = Long.valueOf(rawUserId);
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token inválido");
        }

        return userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));
    }

    public ProfesionalProfileResponse getProfesionalProfile(String rawUserId) {
        User user = loadUserByRawId(rawUserId);
        if (user.getRole() != UserRole.PROFESSIONAL) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo profesionales");
        }

        ProfessionalProfile profile = professionalProfileRepository.findByUser_Id(user.getId())
            .orElseGet(() -> bootstrapMissingProfessionalProfile(user));

        if (profile.getSlug() == null || profile.getSlug().isBlank()) {
            profile.setSlug(
                SlugUtils.generateUniqueSlug(user.getFullName(), professionalProfileRepository::existsBySlug)
            );
            profile = professionalProfileRepository.save(profile);
            searchSyncPublisher.publishProfileChanged(profile.getId());
        }

        return new ProfesionalProfileResponse(
            String.valueOf(user.getId()),
            profile.getSlug(),
            user.getFullName(),
            user.getEmail(),
            user.getPhoneNumber(),
            profile.getRubro(),
            profile.getLocation(),
            profile.getLatitude(),
            profile.getLongitude(),
            profile.getTipoCliente(),
            profile.getLogoUrl(),
            profile.getPublicHeadline(),
            profile.getPublicAbout(),
            profile.getPublicPhotos(),
            mapCategories(profile.getCategories()),
            user.getCreatedAt()
        );
    }

    private ProfessionalProfile bootstrapMissingProfessionalProfile(User user) {
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setUser(user);
        profile.setRubro("Profesional");
        profile.setDisplayName(user.getFullName());
        profile.setSlug(
            SlugUtils.generateUniqueSlug(
                user.getFullName(),
                professionalProfileRepository::existsBySlug
            )
        );
        profile.setTipoCliente("SIN_LOCAL");
        profile.setLocation(null);
        profile.setLocationText(null);
        profile.setLatitude(null);
        profile.setLongitude(null);
        profile.setActive(true);

        try {
            ProfessionalProfile created = professionalProfileRepository.save(profile);
            searchSyncPublisher.publishProfileChanged(created.getId());
            return created;
        } catch (DataIntegrityViolationException exception) {
            return professionalProfileRepository.findByUser_Id(user.getId())
                .orElseThrow(() -> new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "No se pudo inicializar el perfil profesional"
                ));
        }
    }

    public UserResponse getClienteProfile(String rawUserId) {
        User user = loadUserByRawId(rawUserId);
        if (user.getRole() != UserRole.USER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo clientes");
        }
        return toUserResponse(user);
    }

    private UserResponse toUserResponse(User user) {
        return new UserResponse(
            String.valueOf(user.getId()),
            user.getEmail(),
            user.getFullName(),
            user.getCreatedAt()
        );
    }

    private String normalizeOAuthEmail(String email) {
        String normalized = normalizeOAuthValue(email);
        if (normalized == null) {
            return null;
        }
        return normalized.toLowerCase(Locale.ROOT);
    }

    private String normalizeOAuthProvider(String provider) {
        String normalized = normalizeOAuthValue(provider);
        if (normalized == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provider OAuth inválido");
        }
        return normalized.toLowerCase(Locale.ROOT);
    }

    private String normalizeOAuthValue(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private String buildSyntheticOAuthEmail(String provider, String providerId) {
        return provider + "+" + providerId + "@oauth.plura.local";
    }

    private String resolveOAuthDisplayName(String name, String email) {
        String normalizedName = normalizeOAuthValue(name);
        if (normalizedName != null) {
            return normalizedName;
        }
        int atIndex = email == null ? -1 : email.indexOf('@');
        if (atIndex > 0) {
            return email.substring(0, atIndex);
        }
        return "Usuario";
    }

    private String normalizeTipoCliente(String rawTipoCliente) {
        if (rawTipoCliente == null) return "";
        return rawTipoCliente.trim().toUpperCase();
    }

    private String normalizeLocation(String rawLocation) {
        if (rawLocation == null) return null;
        String trimmed = rawLocation.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private void validateCoordinatesPair(Double latitude, Double longitude) {
        if ((latitude == null) == (longitude == null)) {
            return;
        }
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "latitude y longitude deben enviarse juntas"
        );
    }

    private Double normalizeLatitude(Double rawLatitude) {
        if (rawLatitude == null) {
            return null;
        }
        if (rawLatitude < -90d || rawLatitude > 90d) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "latitude fuera de rango");
        }
        return rawLatitude;
    }

    private Double normalizeLongitude(Double rawLongitude) {
        if (rawLongitude == null) {
            return null;
        }
        if (rawLongitude < -180d || rawLongitude > 180d) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "longitude fuera de rango");
        }
        return rawLongitude;
    }

    private Set<Category> resolveCategoriesForRegistration(RegisterProfesionalRequest request) {
        List<String> incoming = request.getCategorySlugs();
        if (incoming != null && !incoming.isEmpty()) {
            Set<String> normalizedSlugs = incoming.stream()
                .map(this::normalizeSlug)
                .filter(slug -> !slug.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));
            if (normalizedSlugs.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seleccioná al menos un rubro");
            }
            return loadCategoriesBySlugs(normalizedSlugs);
        }

        String legacyRubro = request.getRubro() == null ? "" : request.getRubro().trim();
        if (legacyRubro.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seleccioná al menos un rubro");
        }
        String slug = mapLegacyCategorySlug(SlugUtils.toSlug(legacyRubro));
        return loadCategoriesBySlugs(Set.of(slug));
    }

    private Set<Category> loadCategoriesBySlugs(Set<String> slugs) {
        List<Category> categories = categoryRepository.findBySlugIn(slugs);
        Set<String> foundSlugs = categories.stream()
            .map(Category::getSlug)
            .collect(Collectors.toSet());
        Set<String> missing = slugs.stream()
            .filter(slug -> !foundSlugs.contains(slug))
            .collect(Collectors.toCollection(LinkedHashSet::new));
        if (!missing.isEmpty()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Rubros inválidos: " + String.join(", ", missing)
            );
        }
        return new LinkedHashSet<>(categories);
    }

    private String resolvePrimaryCategoryName(Set<Category> categories, String legacyRubro) {
        return categories.stream()
            .sorted(categoryComparator())
            .map(Category::getName)
            .findFirst()
            .orElseGet(() -> legacyRubro == null ? "" : legacyRubro.trim());
    }

    private String normalizeSlug(String rawSlug) {
        if (rawSlug == null) return "";
        String normalized = rawSlug.trim().toLowerCase(Locale.ROOT);
        return mapLegacyCategorySlug(normalized);
    }

    private String mapLegacyCategorySlug(String slug) {
        return LEGACY_CATEGORY_ALIASES.getOrDefault(slug, slug);
    }

    private List<CategoryResponse> mapCategories(Set<Category> categories) {
        if (categories == null || categories.isEmpty()) {
            return List.of();
        }
        return categories.stream()
            .sorted(categoryComparator())
            .map(category -> new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getSlug(),
                category.getImageUrl(),
                category.getDisplayOrder()
            ))
            .toList();
    }

    private Comparator<Category> categoryComparator() {
        return Comparator.comparingInt(
            (Category category) -> category.getDisplayOrder() == null ? Integer.MAX_VALUE : category.getDisplayOrder()
        ).thenComparing(Category::getName);
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/auth/dto/LoginRequest.java
```java
package com.plura.plurabackend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class LoginRequest {

    @NotBlank
    @Email
    @Size(max = 255)
    private String email;

    @NotBlank
    @Size(min = 8, max = 100)
    private String password;
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/auth/dto/ProfesionalProfileResponse.java
```java
package com.plura.plurabackend.auth.dto;

import com.plura.plurabackend.category.dto.CategoryResponse;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ProfesionalProfileResponse {
    private String id;
    private String slug;
    private String fullName;
    private String email;
    private String phoneNumber;
    private String rubro;
    private String location;
    private Double latitude;
    private Double longitude;
    private String tipoCliente;
    private String logoUrl;
    private String publicHeadline;
    private String publicAbout;
    private List<String> publicPhotos;
    private List<CategoryResponse> categories;
    private LocalDateTime createdAt;
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/auth/dto/RegisterProfesionalRequest.java
```java
package com.plura.plurabackend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Data;

@Data
public class RegisterProfesionalRequest {

    // Nombre visible del profesional/empresa.
    @NotBlank
    @Size(min = 2, max = 120)
    private String fullName;

    // Rubro o categoría principal.
    private String rubro;

    // Slugs de categorías seleccionadas.
    private List<String> categorySlugs;

    // Email único usado como identificador.
    @NotBlank
    @Email
    @Size(max = 255)
    private String email;

    // Teléfono de contacto.
    @NotBlank
    @Size(max = 30)
    @Pattern(regexp = "^[+0-9()\\-\\s]{3,30}$")
    private String phoneNumber;

    // Ubicación del local (si aplica).
    @Size(max = 255)
    private String location;

    // Coordenadas geocodificadas de la ubicación.
    private Double latitude;
    private Double longitude;

    // Define si tiene local o es a domicilio.
    @NotBlank
    @Pattern(regexp = "^(?i)(LOCAL|A_DOMICILIO|SIN_LOCAL)$")
    private String tipoCliente;

    // Contraseña en texto plano (se hashea al persistir).
    @NotBlank
    @Size(min = 8, max = 100)
    private String password;
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/auth/dto/RegisterRequest.java
```java
package com.plura.plurabackend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    // Nombre visible del usuario.
    @NotBlank
    @Size(min = 2, max = 120)
    private String fullName;

    // Email único usado como identificador.
    @NotBlank
    @Email
    @Size(max = 255)
    private String email;

    // Teléfono de contacto.
    @NotBlank
    @Size(max = 30)
    @Pattern(regexp = "^[+0-9()\\-\\s]{3,30}$")
    private String phoneNumber;

    // Contraseña en texto plano (se hashea al persistir).
    @NotBlank
    @Size(min = 8, max = 100)
    private String password;
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/auth/dto/RegisterResponse.java
```java
package com.plura.plurabackend.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class RegisterResponse {
    // JWT de acceso (opcional si se usa cookie HttpOnly).
    private String accessToken;
    // Datos públicos del usuario creado.
    private UserResponse user;
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/auth/dto/UserResponse.java
```java
package com.plura.plurabackend.auth.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UserResponse {
    // Identificador único del usuario.
    private String id;
    // Email público del usuario.
    private String email;
    // Nombre para mostrar.
    private String fullName;
    // Fecha de creación de la cuenta.
    private LocalDateTime createdAt;
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/auth/model/RefreshToken.java
```java
package com.plura.plurabackend.auth.model;

import com.plura.plurabackend.user.model.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
    name = "auth_refresh_token",
    indexes = {
        @Index(name = "idx_refresh_token_hash", columnList = "token", unique = true),
        @Index(name = "idx_refresh_token_user", columnList = "user_id"),
        @Index(name = "idx_refresh_token_expires", columnList = "expiry_date")
    }
)
public class RefreshToken {

    @Id
    @Column(nullable = false, length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 64, unique = true)
    private String token;

    @Column(name = "expiry_date", nullable = false)
    private LocalDateTime expiryDate;

    @Column(name = "revoked")
    private LocalDateTime revokedAt;

    @PrePersist
    void onCreate() {
        if (this.id == null || this.id.isBlank()) {
            this.id = java.util.UUID.randomUUID().toString();
        }
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/auth/oauth/OAuthService.java
```java
package com.plura.plurabackend.auth.oauth;

import com.plura.plurabackend.auth.oauth.providers.AppleTokenVerifier;
import com.plura.plurabackend.auth.oauth.providers.GoogleTokenVerifier;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OAuthService {

    private final GoogleTokenVerifier googleTokenVerifier;
    private final AppleTokenVerifier appleTokenVerifier;

    public OAuthService(
        GoogleTokenVerifier googleTokenVerifier,
        AppleTokenVerifier appleTokenVerifier
    ) {
        this.googleTokenVerifier = googleTokenVerifier;
        this.appleTokenVerifier = appleTokenVerifier;
    }

    public OAuthUserInfo verify(String provider, String token) {
        String normalizedProvider = normalizeProvider(provider);
        return switch (normalizedProvider) {
            case "google" -> googleTokenVerifier.verify(token);
            case "apple" -> appleTokenVerifier.verify(token);
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provider OAuth inválido");
        };
    }

    private String normalizeProvider(String provider) {
        if (provider == null) {
            return "";
        }
        return provider.trim().toLowerCase(Locale.ROOT);
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/auth/oauth/OAuthUserInfo.java
```java
package com.plura.plurabackend.auth.oauth;

public record OAuthUserInfo(
    String provider,
    String providerId,
    String email,
    String name,
    String avatar
) {}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/auth/oauth/dto/OAuthLoginRequest.java
```java
package com.plura.plurabackend.auth.oauth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class OAuthLoginRequest {

    @NotBlank
    @Size(max = 20)
    private String provider;

    @NotBlank
    @Size(max = 8192)
    private String token;
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/auth/oauth/providers/AppleTokenVerifier.java
```java
package com.plura.plurabackend.auth.oauth.providers;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTDecodeException;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.auth.oauth.OAuthUserInfo;
import java.io.IOException;
import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.RSAPublicKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class AppleTokenVerifier {

    private static final String APPLE_ISSUER = "https://appleid.apple.com";
    private static final URI APPLE_JWKS_URI = URI.create("https://appleid.apple.com/auth/keys");
    private static final Duration KEY_CACHE_TTL = Duration.ofHours(6);

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String appleClientId;
    private volatile CachedKeys cachedKeys;

    public AppleTokenVerifier(
        @Value("${oauth.apple.client-id:}") String appleClientId,
        ObjectMapper objectMapper
    ) {
        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = objectMapper;
        this.appleClientId = appleClientId == null ? "" : appleClientId.trim();
        this.cachedKeys = new CachedKeys(Map.of(), Instant.EPOCH);
    }

    public OAuthUserInfo verify(String idToken) {
        requireConfigured();

        if (idToken == null || idToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token OAuth inválido");
        }

        DecodedJWT decoded = decode(idToken);
        String keyId = normalize(decoded.getKeyId());
        if (keyId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token de Apple inválido");
        }

        RSAPublicKey publicKey = resolveKey(keyId);
        if (publicKey == null) {
            refreshKeys(true);
            publicKey = resolveKey(keyId);
        }
        if (publicKey == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No se pudo validar firma Apple");
        }

        DecodedJWT verified = verifySignatureAndClaims(idToken, publicKey);

        Instant expiresAt = verified.getExpiresAtAsInstant();
        if (expiresAt == null || expiresAt.isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token de Apple expirado");
        }

        String providerId = normalize(verified.getSubject());
        if (providerId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token de Apple sin subject");
        }

        String email = normalize(verified.getClaim("email").asString());
        String name = email != null ? fallbackName(email) : "Usuario";

        return new OAuthUserInfo(
            "apple",
            providerId,
            email == null ? null : email.toLowerCase(Locale.ROOT),
            name,
            null
        );
    }

    private DecodedJWT decode(String token) {
        try {
            return JWT.decode(token);
        } catch (JWTDecodeException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token de Apple inválido");
        }
    }

    private DecodedJWT verifySignatureAndClaims(String token, RSAPublicKey publicKey) {
        try {
            Algorithm algorithm = Algorithm.RSA256(publicKey, null);
            JWTVerifier verifier = JWT.require(algorithm)
                .withIssuer(APPLE_ISSUER)
                .withAudience(appleClientId)
                .build();
            return verifier.verify(token);
        } catch (JWTVerificationException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token de Apple inválido o expirado");
        }
    }

    private RSAPublicKey resolveKey(String keyId) {
        refreshKeys(false);
        return cachedKeys.byKid().get(keyId);
    }

    private synchronized void refreshKeys(boolean force) {
        CachedKeys current = this.cachedKeys;
        if (!force && !current.isExpired()) {
            return;
        }

        HttpRequest request = HttpRequest.newBuilder()
            .uri(APPLE_JWKS_URI)
            .GET()
            .timeout(Duration.ofSeconds(5))
            .build();

        try {
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "No se pudo obtener claves públicas de Apple"
                );
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode keysNode = root.path("keys");
            if (!keysNode.isArray()) {
                throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Respuesta inválida de claves Apple"
                );
            }

            Map<String, RSAPublicKey> parsed = new HashMap<>();
            for (JsonNode keyNode : keysNode) {
                if (!"RSA".equalsIgnoreCase(keyNode.path("kty").asText())) {
                    continue;
                }
                String kid = normalize(keyNode.path("kid").asText(null));
                String modulus = normalize(keyNode.path("n").asText(null));
                String exponent = normalize(keyNode.path("e").asText(null));
                if (kid == null || modulus == null || exponent == null) {
                    continue;
                }
                parsed.put(kid, buildPublicKey(modulus, exponent));
            }

            if (parsed.isEmpty()) {
                throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "No se encontraron claves RSA de Apple"
                );
            }

            this.cachedKeys = new CachedKeys(Map.copyOf(parsed), Instant.now().plus(KEY_CACHE_TTL));
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "No se pudo consultar claves públicas de Apple"
            );
        } catch (IOException ex) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "No se pudo consultar claves públicas de Apple"
            );
        } catch (GeneralSecurityException | IllegalArgumentException ex) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "No se pudieron procesar claves públicas de Apple"
            );
        }
    }

    private RSAPublicKey buildPublicKey(String modulus, String exponent) throws GeneralSecurityException {
        byte[] modulusBytes = Base64.getUrlDecoder().decode(modulus);
        byte[] exponentBytes = Base64.getUrlDecoder().decode(exponent);
        BigInteger modulusInt = new BigInteger(1, modulusBytes);
        BigInteger exponentInt = new BigInteger(1, exponentBytes);
        RSAPublicKeySpec spec = new RSAPublicKeySpec(modulusInt, exponentInt);
        return (RSAPublicKey) KeyFactory.getInstance("RSA").generatePublic(spec);
    }

    private void requireConfigured() {
        if (appleClientId.isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "OAuth Apple no configurado (APPLE_CLIENT_ID)"
            );
        }
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private String fallbackName(String email) {
        int atIndex = email.indexOf('@');
        if (atIndex <= 0) {
            return "Usuario";
        }
        return email.substring(0, atIndex);
    }

    private record CachedKeys(Map<String, RSAPublicKey> byKid, Instant expiresAt) {
        boolean isExpired() {
            return Instant.now().isAfter(expiresAt);
        }
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/auth/oauth/providers/GoogleTokenVerifier.java
```java
package com.plura.plurabackend.auth.oauth.providers;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.plura.plurabackend.auth.oauth.OAuthUserInfo;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class GoogleTokenVerifier {

    private static final List<String> VALID_ISSUERS = List.of(
        "accounts.google.com",
        "https://accounts.google.com"
    );

    private final String googleClientId;
    private final GoogleIdTokenVerifier verifier;

    public GoogleTokenVerifier(@Value("${oauth.google.client-id:}") String googleClientId) {
        this.googleClientId = googleClientId == null ? "" : googleClientId.trim();
        this.verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
            .setAudience(List.of(this.googleClientId))
            .setIssuers(VALID_ISSUERS)
            .build();
    }

    public OAuthUserInfo verify(String idToken) {
        requireConfigured();

        if (idToken == null || idToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token OAuth inválido");
        }

        GoogleIdToken verified;
        try {
            verified = verifier.verify(idToken);
        } catch (GeneralSecurityException | IOException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No se pudo validar token de Google");
        }

        if (verified == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token de Google inválido o expirado");
        }

        GoogleIdToken.Payload payload = verified.getPayload();
        String email = normalize(payload.getEmail());
        String providerId = normalize(payload.getSubject());
        String name = normalize((String) payload.get("name"));
        String avatar = normalize((String) payload.get("picture"));
        Boolean emailVerified = payload.getEmailVerified();

        if (email == null || providerId == null || !Boolean.TRUE.equals(emailVerified)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token de Google sin datos válidos");
        }

        if (name == null) {
            name = fallbackName(email);
        }

        return new OAuthUserInfo(
            "google",
            providerId,
            email.toLowerCase(Locale.ROOT),
            name,
            avatar
        );
    }

    private void requireConfigured() {
        if (googleClientId.isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "OAuth Google no configurado (GOOGLE_CLIENT_ID)"
            );
        }
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private String fallbackName(String email) {
        int atIndex = email.indexOf('@');
        if (atIndex <= 0) {
            return "Usuario";
        }
        return email.substring(0, atIndex);
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/auth/repository/RefreshTokenRepository.java
```java
package com.plura.plurabackend.auth.repository;

import com.plura.plurabackend.auth.model.RefreshToken;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, String> {
    Optional<RefreshToken> findByTokenAndRevokedAtIsNull(String token);

    Optional<RefreshToken> findByToken(String token);
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/availability/model/AvailableSlot.java
```java
package com.plura.plurabackend.availability.model;

import com.plura.plurabackend.professional.model.ProfessionalProfile;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(
    name = "available_slot",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_available_slot_professional_start", columnNames = {"professional_id", "start_at"})
    }
)
public class AvailableSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "professional_id", nullable = false)
    private ProfessionalProfile professional;

    @Column(name = "start_at", nullable = false)
    private LocalDateTime startAt;

    @Column(name = "end_at", nullable = false)
    private LocalDateTime endAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AvailableSlotStatus status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = AvailableSlotStatus.AVAILABLE;
        }
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/availability/repository/AvailableSlotRepository.java
```java
package com.plura.plurabackend.availability.repository;

import com.plura.plurabackend.availability.model.AvailableSlot;
import com.plura.plurabackend.availability.model.AvailableSlotStatus;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AvailableSlotRepository extends JpaRepository<AvailableSlot, Long> {

    @Query(
        value = """
        SELECT pg_advisory_xact_lock(:professionalId)
        """,
        nativeQuery = true
    )
    void lockProfessionalSlots(@Param("professionalId") Long professionalId);

    @Modifying
    @Query(
        """
        DELETE FROM AvailableSlot slot
        WHERE slot.professional.id = :professionalId
          AND slot.startAt >= :from
          AND slot.startAt < :to
        """
    )
    int deleteByProfessionalAndStartAtBetween(
        @Param("professionalId") Long professionalId,
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to
    );

    @Modifying
    @Query(
        """
        UPDATE AvailableSlot slot
        SET slot.status = :status
        WHERE slot.professional.id = :professionalId
          AND slot.startAt = :startAt
        """
    )
    int updateStatusByProfessionalAndStartAt(
        @Param("professionalId") Long professionalId,
        @Param("startAt") LocalDateTime startAt,
        @Param("status") AvailableSlotStatus status
    );

    @Query(
        value = """
            SELECT MIN(slot.start_at)
            FROM available_slot slot
            WHERE slot.professional_id = :professionalId
              AND slot.status = 'AVAILABLE'
              AND slot.start_at >= :from
              AND slot.start_at < :to
            """,
        nativeQuery = true
    )
    Optional<LocalDateTime> findNextAvailableStartAt(
        @Param("professionalId") Long professionalId,
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to
    );
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/booking/BookingClientController.java
```java
package com.plura.plurabackend.booking;

import com.plura.plurabackend.booking.dto.ClientNextBookingResponse;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/cliente/reservas")
public class BookingClientController {

    private final BookingClientService bookingClientService;

    public BookingClientController(BookingClientService bookingClientService) {
        this.bookingClientService = bookingClientService;
    }

    @GetMapping("/proxima")
    public ResponseEntity<ClientNextBookingResponse> getNextBooking(Authentication authentication) {
        String rawUserId = getClienteId(authentication);
        Optional<ClientNextBookingResponse> response = bookingClientService.getNextBooking(rawUserId);
        return response.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.noContent().build());
    }

    private String getClienteId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No autenticado");
        }

        boolean isCliente = authentication.getAuthorities().stream()
            .anyMatch(auth -> "ROLE_USER".equals(auth.getAuthority()));
        if (!isCliente) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo clientes");
        }

        return authentication.getPrincipal().toString();
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/booking/BookingClientService.java
```java
package com.plura.plurabackend.booking;

import com.plura.plurabackend.booking.dto.ClientNextBookingResponse;
import com.plura.plurabackend.booking.model.Booking;
import com.plura.plurabackend.booking.model.BookingStatus;
import com.plura.plurabackend.booking.repository.BookingRepository;
import com.plura.plurabackend.user.model.User;
import com.plura.plurabackend.user.model.UserRole;
import com.plura.plurabackend.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BookingClientService {

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final ZoneId systemZoneId;

    public BookingClientService(
        BookingRepository bookingRepository,
        UserRepository userRepository,
        @Value("${app.timezone:America/Montevideo}") String appTimezone
    ) {
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.systemZoneId = ZoneId.of(appTimezone);
    }

    public Optional<ClientNextBookingResponse> getNextBooking(String rawUserId) {
        Long userId = parseUserId(rawUserId);
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));

        if (user.getRole() != UserRole.USER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo clientes");
        }

        LocalDateTime now = ZonedDateTime.now(systemZoneId).toLocalDateTime();
        List<BookingStatus> activeStatuses = List.of(BookingStatus.PENDING, BookingStatus.CONFIRMED);

        return bookingRepository.findFirstByUserAndStatusInAndStartDateTimeAfterOrderByStartDateTimeAsc(
            user,
            activeStatuses,
            now
        ).map(this::mapNextBooking);
    }

    private ClientNextBookingResponse mapNextBooking(Booking booking) {
        return new ClientNextBookingResponse(
            booking.getId(),
            booking.getStatus().name(),
            booking.getStartDateTime().toString(),
            booking.getService().getName(),
            booking.getProfessional().getUser().getFullName(),
            booking.getProfessional().getSlug(),
            booking.getProfessional().getLocation()
        );
    }

    private Long parseUserId(String rawUserId) {
        if (rawUserId == null || rawUserId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No autenticado");
        }
        try {
            return Long.parseLong(rawUserId.trim());
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token invalido");
        }
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/booking/dto/ClientNextBookingResponse.java
```java
package com.plura.plurabackend.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ClientNextBookingResponse {
    private Long id;
    private String status;
    private String startDateTime;
    private String serviceName;
    private String professionalName;
    private String professionalSlug;
    private String professionalLocation;
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/booking/dto/ProfessionalBookingCreateRequest.java
```java
package com.plura.plurabackend.booking.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ProfessionalBookingCreateRequest {

    @NotBlank
    @Size(max = 120)
    private String clientName;

    @Size(max = 120)
    @Email
    private String clientEmail;

    @Size(max = 40)
    private String clientPhone;

    @NotBlank
    @Size(max = 36)
    private String serviceId;

    @NotBlank
    @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}T.*$")
    private String startDateTime;
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/booking/dto/ProfessionalBookingResponse.java
```java
package com.plura.plurabackend.booking.dto;

import com.plura.plurabackend.booking.model.BookingStatus;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class ProfessionalBookingResponse {
    private Long id;
    private String userId;
    private String clientName;
    private String serviceId;
    private String serviceName;
    private String startDateTime;
    private String duration;
    private Integer postBufferMinutes;
    private Integer effectiveDurationMinutes;
    private String status;

    public ProfessionalBookingResponse(
        Long id,
        Long userId,
        String clientName,
        String serviceId,
        String serviceName,
        LocalDateTime startDateTime,
        String duration,
        Integer postBufferMinutes,
        BookingStatus status
    ) {
        this(
            id,
            userId == null ? null : String.valueOf(userId),
            clientName,
            serviceId,
            serviceName,
            startDateTime == null ? "" : startDateTime.toString(),
            duration,
            postBufferMinutes == null ? 0 : postBufferMinutes,
            resolveEffectiveDurationMinutes(duration, postBufferMinutes),
            status == null ? "" : status.name()
        );
    }

    public static int resolveEffectiveDurationMinutes(String duration, Integer postBufferMinutes) {
        int baseDuration = parseDurationToMinutes(duration);
        int buffer = postBufferMinutes == null ? 0 : Math.max(0, postBufferMinutes);
        return baseDuration + buffer;
    }

    private static int parseDurationToMinutes(String duration) {
        if (duration == null || duration.isBlank()) {
            return 30;
        }

        String normalized = duration.trim().toLowerCase();
        if (normalized.matches("^\\d+$")) {
            int minutes = Integer.parseInt(normalized);
            return minutes > 0 ? minutes : 30;
        }

        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("\\d+").matcher(normalized);
        java.util.List<Integer> numbers = new java.util.ArrayList<>();
        while (matcher.find()) {
            numbers.add(Integer.parseInt(matcher.group()));
        }
        if (numbers.isEmpty()) {
            return 30;
        }

        if (normalized.contains("h")) {
            int hours = numbers.get(0);
            int extraMinutes = numbers.size() > 1 ? numbers.get(1) : 0;
            int minutes = (hours * 60) + extraMinutes;
            return minutes > 0 ? minutes : 30;
        }

        int minutes = numbers.get(0);
        return minutes > 0 ? minutes : 30;
    }

    public ProfessionalBookingResponse(
        Long id,
        String userId,
        String clientName,
        String serviceId,
        String serviceName,
        String startDateTime,
        String duration,
        Integer postBufferMinutes,
        Integer effectiveDurationMinutes,
        String status
    ) {
        this.id = id;
        this.userId = userId;
        this.clientName = clientName;
        this.serviceId = serviceId;
        this.serviceName = serviceName;
        this.startDateTime = startDateTime;
        this.duration = duration;
        this.postBufferMinutes = postBufferMinutes == null ? 0 : Math.max(0, postBufferMinutes);
        this.effectiveDurationMinutes = effectiveDurationMinutes == null
            ? resolveEffectiveDurationMinutes(duration, this.postBufferMinutes)
            : effectiveDurationMinutes;
        this.status = status;
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/booking/dto/ProfessionalBookingUpdateRequest.java
```java
package com.plura.plurabackend.booking.dto;

import com.plura.plurabackend.booking.model.BookingStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ProfessionalBookingUpdateRequest {

    @NotNull
    private BookingStatus status;
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/booking/dto/PublicBookingRequest.java
```java
package com.plura.plurabackend.booking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class PublicBookingRequest {

    @NotBlank
    @Size(max = 36)
    private String serviceId;

    @NotBlank
    @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}T.*$")
    private String startDateTime;
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/booking/dto/PublicBookingResponse.java
```java
package com.plura.plurabackend.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PublicBookingResponse {
    private Long id;
    private String status;
    private String startDateTime;
    private String serviceId;
    private String professionalId;
    private String userId;
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/booking/model/Booking.java
```java
package com.plura.plurabackend.booking.model;

import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.service.model.ProfesionalService;
import com.plura.plurabackend.user.model.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
    name = "booking",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uq_professional_start",
            columnNames = {"professional_id", "start_date_time"}
        )
    }
)
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "professional_id", nullable = false)
    private ProfessionalProfile professional;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_id", nullable = false)
    private ProfesionalService service;

    @Column(name = "start_date_time", nullable = false)
    private LocalDateTime startDateTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BookingStatus status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/booking/model/BookingStatus.java
```java
package com.plura.plurabackend.booking.model;

public enum BookingStatus {
    PENDING,
    CONFIRMED,
    CANCELLED,
    COMPLETED
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/booking/repository/BookingRepository.java
```java
package com.plura.plurabackend.booking.repository;

import com.plura.plurabackend.booking.dto.ProfessionalBookingResponse;
import com.plura.plurabackend.booking.model.Booking;
import com.plura.plurabackend.booking.model.BookingStatus;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.user.model.User;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    boolean existsByProfessionalAndStartDateTime(
        ProfessionalProfile professional,
        LocalDateTime startDateTime
    );

    Optional<Booking> findFirstByUserAndStatusInAndStartDateTimeAfterOrderByStartDateTimeAsc(
        User user,
        List<BookingStatus> statuses,
        LocalDateTime startDateTime
    );

    @Query(
        """
        SELECT new com.plura.plurabackend.booking.dto.ProfessionalBookingResponse(
            b.id,
            u.id,
            u.fullName,
            s.id,
            s.name,
            b.startDateTime,
            s.duration,
            s.postBufferMinutes,
            b.status
        )
        FROM Booking b
        JOIN b.user u
        JOIN b.service s
        WHERE b.professional = :professional
            AND b.startDateTime BETWEEN :start AND :end
        ORDER BY b.startDateTime ASC
        """
    )
    List<ProfessionalBookingResponse> findProfessionalBookingResponsesByProfessionalAndStartDateTimeBetween(
        @Param("professional") ProfessionalProfile professional,
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end
    );

    @Query(
        """
        SELECT b.startDateTime
        FROM Booking b
        WHERE b.professional = :professional
            AND b.startDateTime BETWEEN :start AND :end
            AND b.status <> :excludedStatus
        """
    )
    List<LocalDateTime> findBookedStartDateTimes(
        @Param("professional") ProfessionalProfile professional,
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end,
        @Param("excludedStatus") BookingStatus excludedStatus
    );

    @Query(
        """
        SELECT b
        FROM Booking b
        JOIN FETCH b.service s
        WHERE b.professional = :professional
            AND b.startDateTime >= :start
            AND b.startDateTime <= :end
            AND b.status <> :excludedStatus
        ORDER BY b.startDateTime ASC
        """
    )
    List<Booking> findBookedWithServiceByProfessionalAndStartDateTimeBetween(
        @Param("professional") ProfessionalProfile professional,
        @Param("start") LocalDateTime start,
        @Param("end") LocalDateTime end,
        @Param("excludedStatus") BookingStatus excludedStatus
    );

    long countByCreatedAtGreaterThanEqualAndCreatedAtLessThanAndStatusNot(
        LocalDateTime from,
        LocalDateTime to,
        BookingStatus status
    );

    @Query(
        """
        SELECT b.professional.id, COUNT(b.id)
        FROM Booking b
        WHERE b.status IN :statuses
        GROUP BY b.professional.id
        ORDER BY COUNT(b.id) DESC
        """
    )
    List<Object[]> findTopProfessionalIdsByStatuses(
        @Param("statuses") List<BookingStatus> statuses,
        Pageable pageable
    );
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/category/CategoryController.java
```java
package com.plura.plurabackend.category;

import com.plura.plurabackend.category.dto.CategoryResponse;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping({"/categories", "/api/categories"})
    public List<CategoryResponse> listCategories() {
        return categoryService.listActiveCategories();
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/category/model/Category.java
```java
package com.plura.plurabackend.category.model;

import com.plura.plurabackend.professional.model.ProfessionalProfile;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "categories")
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "display_order")
    private Integer displayOrder;

    @Column(nullable = false)
    private Boolean active = true;

    @ManyToMany(mappedBy = "categories", fetch = FetchType.LAZY)
    private Set<ProfessionalProfile> professionals = new HashSet<>();
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/category/repository/CategoryRepository.java
```java
package com.plura.plurabackend.category.repository;

import com.plura.plurabackend.category.model.Category;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, UUID> {
    Optional<Category> findBySlug(String slug);

    List<Category> findBySlugIn(Collection<String> slugs);

    List<Category> findByActiveTrueOrderByDisplayOrderAscNameAsc();

    long countByActiveTrue();
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/config/AsyncConfig.java
```java
package com.plura.plurabackend.config;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
public class AsyncConfig {

    @Bean(name = "availableSlotExecutor")
    public Executor availableSlotExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setThreadNamePrefix("available-slot-");
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(8);
        executor.setQueueCapacity(500);
        // Evita que un request HTTP termine ejecutando rebuild pesado cuando la cola se satura.
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.AbortPolicy());
        executor.initialize();
        return executor;
    }

    @Bean(name = "imageProcessingExecutor")
    public Executor imageProcessingExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setThreadNamePrefix("image-job-");
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(200);
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.AbortPolicy());
        executor.initialize();
        return executor;
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/config/CacheConfig.java
```java
package com.plura.plurabackend.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import java.util.concurrent.TimeUnit;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager("homeData", "activeCategories");
        manager.setCaffeine(Caffeine.newBuilder()
            .expireAfterWrite(5, TimeUnit.MINUTES)
            .maximumSize(50));
        return manager;
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/config/StaticResourceConfig.java
```java
package com.plura.plurabackend.config;

import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {

    private final Path uploadRootPath;

    public StaticResourceConfig(@Value("${app.storage.upload-dir:uploads}") String uploadDir) {
        this.uploadRootPath = Path.of(uploadDir).toAbsolutePath().normalize();
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = uploadRootPath.toUri().toString();
        if (!location.endsWith("/")) {
            location = location + "/";
        }
        registry.addResourceHandler("/uploads/**").addResourceLocations(location);
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/config/error/GlobalExceptionHandler.java
```java
package com.plura.plurabackend.config.error;

import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.time.Instant;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleMethodArgumentNotValid(
        MethodArgumentNotValidException exception,
        HttpServletRequest request
    ) {
        String message = exception.getBindingResult().getFieldErrors().stream()
            .map(this::formatFieldError)
            .collect(Collectors.joining("; "));
        if (message.isBlank()) {
            message = "Validation failed";
        }
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message, request);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleConstraintViolation(
        ConstraintViolationException exception,
        HttpServletRequest request
    ) {
        String message = exception.getConstraintViolations().stream()
            .map(violation -> violation.getPropertyPath() + ": " + violation.getMessage())
            .collect(Collectors.joining("; "));
        if (message.isBlank()) {
            message = "Validation constraint violation";
        }
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message, request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorResponse> handleIllegalArgument(
        IllegalArgumentException exception,
        HttpServletRequest request
    ) {
        String message = exception.getMessage() == null || exception.getMessage().isBlank()
            ? "Invalid argument"
            : exception.getMessage();
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "ILLEGAL_ARGUMENT", message, request);
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleEntityNotFound(
        EntityNotFoundException exception,
        HttpServletRequest request
    ) {
        String message = exception.getMessage() == null || exception.getMessage().isBlank()
            ? "Entity not found"
            : exception.getMessage();
        return buildErrorResponse(HttpStatus.NOT_FOUND, "ENTITY_NOT_FOUND", message, request);
    }

    private String formatFieldError(FieldError fieldError) {
        String field = fieldError.getField() == null ? "field" : fieldError.getField();
        String message = fieldError.getDefaultMessage() == null ? "invalid value" : fieldError.getDefaultMessage();
        return field + ": " + message;
    }

    private ResponseEntity<ApiErrorResponse> buildErrorResponse(
        HttpStatus status,
        String error,
        String message,
        HttpServletRequest request
    ) {
        ApiErrorResponse response = new ApiErrorResponse(
            Instant.now().toString(),
            status.value(),
            error,
            message,
            request.getRequestURI()
        );
        return ResponseEntity.status(status).body(response);
    }

    public record ApiErrorResponse(
        String timestamp,
        int status,
        String error,
        String message,
        String path
    ) {}
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/config/jwt/JwtAuthenticationFilter.java
```java
package com.plura.plurabackend.config.jwt;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JWTVerifier verifier;

    public JwtAuthenticationFilter(
        @Value("${jwt.secret}") String jwtSecret,
        @Value("${jwt.issuer:plura}") String jwtIssuer
    ) {
        // Construye el verificador con el secreto e issuer esperado.
        Algorithm algorithm = Algorithm.HMAC256(jwtSecret);
        this.verifier = JWT.require(algorithm)
            .withIssuer(jwtIssuer)
            .build();
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String token = null;
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        }

        if (token == null || token.isBlank()) {
            if (request.getCookies() != null) {
                for (var cookie : request.getCookies()) {
                    if ("plura_access_token".equals(cookie.getName())) {
                        token = cookie.getValue();
                        break;
                    }
                }
            }
        }

        if (token == null || token.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }
        try {
            // Verifica firma, expiración e issuer.
            DecodedJWT jwt = verifier.verify(token);
            String subject = jwt.getSubject();
            String role = jwt.getClaim("role").asString();
            List<GrantedAuthority> authorities = new ArrayList<>();

            // Mapea el role del JWT a un rol de Spring Security.
            if ("PROFESSIONAL".equals(role)) {
                authorities.add(new SimpleGrantedAuthority("ROLE_PROFESSIONAL"));
            } else if ("USER".equals(role)) {
                authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
            }

            // Crea la autenticación con el subject del JWT.
            UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(subject, null, authorities);
            SecurityContextHolder.getContext().setAuthentication(authentication);
            filterChain.doFilter(request, response);
        } catch (JWTVerificationException ex) {
            // Limpia el contexto y responde 401 si el token es inválido/expirado.
            SecurityContextHolder.clearContext();
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token inválido o expirado");
        }
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/config/ratelimit/RateLimitingFilter.java
```java
package com.plura.plurabackend.config.ratelimit;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final Duration EVICTION_AGE = Duration.ofHours(2);
    private static final long CLEANUP_FREQUENCY = 1_000;

    private final ObjectMapper objectMapper;
    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> lastAccessEpochMs = new ConcurrentHashMap<>();
    private final AtomicLong requestCount = new AtomicLong(0);

    public RateLimitingFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        RateLimitTarget target = resolveTarget(request);
        if (target == null) {
            filterChain.doFilter(request, response);
            return;
        }

        String key = target.keyPrefix() + ":" + target.identifier();
        Bucket bucket = buckets.computeIfAbsent(key, ignored -> newBucket(target.capacityPerMinute()));
        lastAccessEpochMs.put(key, System.currentTimeMillis());
        maybeCleanup();

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (probe.isConsumed()) {
            response.setHeader("X-Rate-Limit-Remaining", String.valueOf(probe.getRemainingTokens()));
            filterChain.doFilter(request, response);
            return;
        }

        long waitSeconds = Math.max(1L, probe.getNanosToWaitForRefill() / 1_000_000_000L);
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setHeader("Retry-After", String.valueOf(waitSeconds));
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(objectMapper.writeValueAsString(Map.of(
            "timestamp", Instant.now().toString(),
            "status", HttpStatus.TOO_MANY_REQUESTS.value(),
            "error", "RATE_LIMIT_EXCEEDED",
            "message", "Demasiadas solicitudes. Intentá nuevamente en unos segundos.",
            "path", request.getRequestURI()
        )));
    }

    private Bucket newBucket(long capacityPerMinute) {
        Bandwidth bandwidth = Bandwidth.classic(
            capacityPerMinute,
            Refill.intervally(capacityPerMinute, Duration.ofMinutes(1))
        );
        return Bucket.builder().addLimit(bandwidth).build();
    }

    private RateLimitTarget resolveTarget(HttpServletRequest request) {
        String method = request.getMethod();
        String path = request.getRequestURI();

        if ("POST".equals(method) && ("/auth/login".equals(path) || path.startsWith("/auth/login/"))) {
            return new RateLimitTarget("login-ip", extractClientIp(request), 5);
        }
        if ("POST".equals(method) && ("/auth/register".equals(path) || path.startsWith("/auth/register/"))) {
            return new RateLimitTarget("register-ip", extractClientIp(request), 3);
        }
        if ("POST".equals(method) && path.matches("^/public/profesionales/[^/]+/reservas$")) {
            return new RateLimitTarget("booking-user", resolveUserOrIp(request), 10);
        }
        if ("GET".equals(method) && "/api/search".equals(path)) {
            return new RateLimitTarget("search-ip", extractClientIp(request), 60);
        }
        if ("GET".equals(method) && "/api/search/suggest".equals(path)) {
            return new RateLimitTarget("suggest-ip", extractClientIp(request), 120);
        }
        return null;
    }

    private String resolveUserOrIp(HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (
            authentication != null
                && authentication.isAuthenticated()
                && authentication.getPrincipal() != null
        ) {
            return "user:" + authentication.getPrincipal().toString();
        }
        return "ip:" + extractClientIp(request);
    }

    private String extractClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            int comma = forwarded.indexOf(',');
            return (comma >= 0 ? forwarded.substring(0, comma) : forwarded).trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }

    private void maybeCleanup() {
        long current = requestCount.incrementAndGet();
        if (current % CLEANUP_FREQUENCY != 0) {
            return;
        }
        long cutoff = System.currentTimeMillis() - EVICTION_AGE.toMillis();
        lastAccessEpochMs.forEach((key, timestamp) -> {
            if (timestamp != null && timestamp < cutoff) {
                lastAccessEpochMs.remove(key, timestamp);
                buckets.remove(key);
            }
        });
    }

    private record RateLimitTarget(String keyPrefix, String identifier, long capacityPerMinute) {}
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/config/security/PasswordConfig.java
```java
package com.plura.plurabackend.config.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class PasswordConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        // BCrypt con factor de coste 12 para balancear seguridad y rendimiento.
        return new BCryptPasswordEncoder(12);
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/config/security/SecurityConfig.java
```java
package com.plura.plurabackend.config.security;

import com.plura.plurabackend.config.jwt.JwtAuthenticationFilter;
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
        RateLimitingFilter rateLimitingFilter
    )
        throws Exception {
        http
            // API stateless: no sesiones y sin CSRF para API token-based.
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
                .addHeaderWriter(new StaticHeadersWriter("X-XSS-Protection", "1; mode=block"))
                .addHeaderWriter(new StaticHeadersWriter("Permissions-Policy", "geolocation=(), microphone=(), camera=()"))
            )
            .authorizeHttpRequests(auth -> auth
                // Permite preflight CORS.
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // Endpoints públicos de autenticación.
                .requestMatchers(
                    "/auth/login",
                    "/auth/login/**",
                    "/auth/oauth",
                    "/auth/register",
                    "/auth/register/**",
                    "/auth/refresh",
                    "/auth/logout",
                    "/api/home",
                    "/api/search",
                    "/api/search/suggest",
                    "/api/geo/autocomplete",
                    "/categories",
                    "/api/categories",
                    "/health",
                    "/uploads/**",
                    "/error"
                ).permitAll()
                .requestMatchers("/public/**").permitAll()
                .requestMatchers("/auth/me/profesional", "/auth/me/professional").hasRole("PROFESSIONAL")
                .requestMatchers("/auth/me/cliente").hasRole("USER")
                .requestMatchers("/profesional/**").hasRole("PROFESSIONAL")
                .requestMatchers("/cliente/**").hasRole("USER")
                // Swagger: deshabilitado por defecto via springdoc.swagger-ui.enabled=false.
                // Si se habilita (SWAGGER_ENABLED=true), requiere autenticación.
                .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**").authenticated()
                // Todo lo demás requiere JWT válido.
                .anyRequest().authenticated()
            )
            // Respuesta 401 si no hay autenticación.
            .exceptionHandling(ex -> ex.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
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
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/geo/GeoController.java
```java
package com.plura.plurabackend.geo;

import com.plura.plurabackend.geo.dto.GeoAutocompleteItemResponse;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/geo")
public class GeoController {

    private final GeoAutocompleteRepository geoAutocompleteRepository;

    public GeoController(GeoAutocompleteRepository geoAutocompleteRepository) {
        this.geoAutocompleteRepository = geoAutocompleteRepository;
    }

    @GetMapping("/autocomplete")
    public List<GeoAutocompleteItemResponse> autocomplete(
        @RequestParam String q,
        @RequestParam(required = false, defaultValue = "8") Integer limit
    ) {
        return geoAutocompleteRepository.autocomplete(q, limit == null ? 8 : limit);
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/health/HealthController.java
```java
package com.plura.plurabackend.health;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    // Endpoint simple para verificar que la API responde.
    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/home/HomeController.java
```java
package com.plura.plurabackend.home;

import com.plura.plurabackend.home.dto.HomeResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/home")
public class HomeController {

    private final HomeService homeService;

    public HomeController(HomeService homeService) {
        this.homeService = homeService;
    }

    @GetMapping
    public HomeResponse getHomeData() {
        return homeService.getHomeData();
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/professional/BookingService.java
```java
package com.plura.plurabackend.professional;

import com.plura.plurabackend.booking.dto.ProfessionalBookingResponse;
import com.plura.plurabackend.booking.dto.ProfessionalBookingCreateRequest;
import com.plura.plurabackend.booking.dto.ProfessionalBookingUpdateRequest;
import com.plura.plurabackend.booking.dto.PublicBookingRequest;
import com.plura.plurabackend.booking.dto.PublicBookingResponse;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class BookingService {

    private final ProfesionalPublicPageCoreService coreService;

    public BookingService(ProfesionalPublicPageCoreService coreService) {
        this.coreService = coreService;
    }

    public PublicBookingResponse createPublicBooking(String slug, PublicBookingRequest request, String rawUserId) {
        return coreService.createPublicBooking(slug, request, rawUserId);
    }

    public List<ProfessionalBookingResponse> getProfessionalBookings(
        String rawUserId,
        String rawDate,
        String rawDateFrom,
        String rawDateTo
    ) {
        return coreService.getProfessionalBookings(rawUserId, rawDate, rawDateFrom, rawDateTo);
    }

    public ProfessionalBookingResponse createProfessionalBooking(
        String rawUserId,
        ProfessionalBookingCreateRequest request
    ) {
        return coreService.createProfessionalBooking(rawUserId, request);
    }

    public ProfessionalBookingResponse updateProfessionalBooking(
        String rawUserId,
        Long bookingId,
        ProfessionalBookingUpdateRequest request
    ) {
        return coreService.updateProfessionalBooking(rawUserId, bookingId, request);
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/professional/ProfesionalConfigController.java
```java
package com.plura.plurabackend.professional;

import com.plura.plurabackend.booking.dto.ProfessionalBookingResponse;
import com.plura.plurabackend.booking.dto.ProfessionalBookingCreateRequest;
import com.plura.plurabackend.booking.dto.ProfessionalBookingUpdateRequest;
import com.plura.plurabackend.professional.dto.ProfesionalBusinessProfileUpdateRequest;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageResponse;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageUpdateRequest;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import com.plura.plurabackend.professional.service.ServiceImageStorageService;
import com.plura.plurabackend.professional.service.dto.ProfesionalServiceRequest;
import com.plura.plurabackend.professional.service.dto.ProfesionalServiceResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/profesional")
public class ProfesionalConfigController {

    private final ProfesionalPublicPageService profesionalPublicPageService;
    private final ServiceImageStorageService serviceImageStorageService;

    public ProfesionalConfigController(
        ProfesionalPublicPageService profesionalPublicPageService,
        ServiceImageStorageService serviceImageStorageService
    ) {
        this.profesionalPublicPageService = profesionalPublicPageService;
        this.serviceImageStorageService = serviceImageStorageService;
    }

    @GetMapping("/public-page")
    public ProfesionalPublicPageResponse getPublicPageConfig() {
        return profesionalPublicPageService.getPublicPageByProfesionalId(getProfesionalId());
    }

    @PutMapping("/public-page")
    public ProfesionalPublicPageResponse updatePublicPageConfig(
        @Valid @RequestBody ProfesionalPublicPageUpdateRequest request
    ) {
        return profesionalPublicPageService.updatePublicPage(getProfesionalId(), request);
    }

    @PutMapping("/profile")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateBusinessProfile(@Valid @RequestBody ProfesionalBusinessProfileUpdateRequest request) {
        profesionalPublicPageService.updateBusinessProfile(getProfesionalId(), request);
    }

    @GetMapping("/schedule")
    public ProfesionalScheduleDto getSchedule() {
        return profesionalPublicPageService.getSchedule(getProfesionalId());
    }

    @PutMapping("/schedule")
    public ProfesionalScheduleDto updateSchedule(@Valid @RequestBody ProfesionalScheduleDto request) {
        return profesionalPublicPageService.updateSchedule(getProfesionalId(), request);
    }

    @GetMapping("/services")
    public List<ProfesionalServiceResponse> listServices() {
        return profesionalPublicPageService.listServices(getProfesionalId());
    }

    @PostMapping("/services")
    @ResponseStatus(HttpStatus.CREATED)
    public ProfesionalServiceResponse createService(@Valid @RequestBody ProfesionalServiceRequest request) {
        return profesionalPublicPageService.createService(getProfesionalId(), request);
    }

    @PostMapping(path = "/services/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> uploadServiceImage(@RequestPart("file") MultipartFile file) {
        String imageUrl = serviceImageStorageService.storeServiceImage(file);
        return Map.of("imageUrl", imageUrl);
    }

    @PutMapping("/services/{id}")
    public ProfesionalServiceResponse updateService(
        @PathVariable("id") String serviceId,
        @Valid @RequestBody ProfesionalServiceRequest request
    ) {
        return profesionalPublicPageService.updateService(getProfesionalId(), serviceId, request);
    }

    @DeleteMapping("/services/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteService(@PathVariable("id") String serviceId) {
        profesionalPublicPageService.deleteService(getProfesionalId(), serviceId);
    }

    @GetMapping("/reservas")
    public List<ProfessionalBookingResponse> listReservations(
        @RequestParam(required = false) String date,
        @RequestParam(required = false) String dateFrom,
        @RequestParam(required = false) String dateTo
    ) {
        return profesionalPublicPageService.getProfessionalBookings(
            getProfesionalId(),
            date,
            dateFrom,
            dateTo
        );
    }

    @PostMapping("/reservas")
    @ResponseStatus(HttpStatus.CREATED)
    public ProfessionalBookingResponse createReservation(
        @Valid @RequestBody ProfessionalBookingCreateRequest request
    ) {
        return profesionalPublicPageService.createProfessionalBooking(getProfesionalId(), request);
    }

    @PutMapping("/reservas/{id}")
    public ProfessionalBookingResponse updateReservation(
        @PathVariable("id") Long bookingId,
        @Valid @RequestBody ProfessionalBookingUpdateRequest request
    ) {
        return profesionalPublicPageService.updateProfessionalBooking(getProfesionalId(), bookingId, request);
    }

    private String getProfesionalId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sin sesión activa");
        }

        boolean isProfesional = authentication.getAuthorities().stream()
            .anyMatch(auth -> "ROLE_PROFESSIONAL".equals(auth.getAuthority()));
        if (!isProfesional) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo profesionales");
        }

        return authentication.getPrincipal().toString();
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/professional/ProfesionalPublicController.java
```java
package com.plura.plurabackend.professional;

import com.plura.plurabackend.booking.dto.PublicBookingRequest;
import com.plura.plurabackend.booking.dto.PublicBookingResponse;
import jakarta.validation.Valid;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageResponse;
import com.plura.plurabackend.professional.dto.ProfesionalPublicSummaryResponse;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/public/profesionales")
public class ProfesionalPublicController {

    private static final Logger LOGGER = LoggerFactory.getLogger(ProfesionalPublicController.class);
    private static final String BOOKING_SLOT_CONSTRAINT = "uq_professional_start";
    private final ProfesionalPublicPageService profesionalPublicPageService;

    public ProfesionalPublicController(ProfesionalPublicPageService profesionalPublicPageService) {
        this.profesionalPublicPageService = profesionalPublicPageService;
    }

    @GetMapping
    public List<ProfesionalPublicSummaryResponse> listProfesionales(
        @RequestParam(required = false) Integer limit,
        @RequestParam(required = false) UUID categoryId,
        @RequestParam(required = false) String categorySlug
    ) {
        return profesionalPublicPageService.listPublicProfessionals(limit, categoryId, categorySlug);
    }

    @GetMapping("/{slug}")
    public ProfesionalPublicPageResponse getProfesionalBySlug(@PathVariable String slug) {
        return profesionalPublicPageService.getPublicPageBySlug(slug);
    }

    @GetMapping("/{slug}/slots")
    public List<String> getAvailableSlots(
        @PathVariable String slug,
        @RequestParam String date,
        @RequestParam String serviceId
    ) {
        return profesionalPublicPageService.getAvailableSlots(slug, date, serviceId);
    }

    @PostMapping("/{slug}/reservas")
    public ResponseEntity<?> createReservation(
        @PathVariable String slug,
        @Valid @RequestBody PublicBookingRequest request,
        Authentication authentication
    ) {
        if (
            authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken
                || authentication.getPrincipal() == null
        ) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No autenticado");
        }

        try {
            PublicBookingResponse response = profesionalPublicPageService.createPublicBooking(
                slug,
                request,
                authentication.getPrincipal().toString()
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (DataIntegrityViolationException exception) {
            if (!isBookingSlotConflict(exception)) {
                LOGGER.error("Error de integridad inesperado al crear reserva pública para slug {}", slug, exception);
                throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "No se pudo crear la reserva"
                );
            }
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("message", "El horario ya fue reservado."));
        } catch (ResponseStatusException exception) {
            if (exception.getStatusCode() == HttpStatus.CONFLICT) {
                String message = exception.getReason() == null || exception.getReason().isBlank()
                    ? "El horario ya fue reservado."
                    : exception.getReason();
                return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", message));
            }
            throw exception;
        }
    }

    private boolean isBookingSlotConflict(DataIntegrityViolationException exception) {
        Throwable rootCause = NestedExceptionUtils.getMostSpecificCause(exception);
        if (rootCause == null || rootCause.getMessage() == null) {
            return false;
        }
        return rootCause.getMessage().contains(BOOKING_SLOT_CONSTRAINT);
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/professional/ProfesionalPublicPageCoreService.java
```java
package com.plura.plurabackend.professional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.availability.AvailableSlotAsyncDispatcher;
import com.plura.plurabackend.availability.AvailableSlotService;
import com.plura.plurabackend.cache.ProfileCacheService;
import com.plura.plurabackend.cache.SlotCacheService;
import com.plura.plurabackend.booking.dto.ProfessionalBookingResponse;
import com.plura.plurabackend.booking.dto.ProfessionalBookingCreateRequest;
import com.plura.plurabackend.booking.dto.ProfessionalBookingUpdateRequest;
import com.plura.plurabackend.booking.dto.PublicBookingRequest;
import com.plura.plurabackend.booking.dto.PublicBookingResponse;
import com.plura.plurabackend.booking.model.Booking;
import com.plura.plurabackend.booking.model.BookingStatus;
import com.plura.plurabackend.booking.repository.BookingRepository;
import com.plura.plurabackend.category.dto.CategoryResponse;
import com.plura.plurabackend.category.model.Category;
import com.plura.plurabackend.category.repository.CategoryRepository;
import com.plura.plurabackend.common.util.SlugUtils;
import com.plura.plurabackend.professional.dto.ProfesionalBusinessProfileUpdateRequest;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageResponse;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageUpdateRequest;
import com.plura.plurabackend.professional.dto.ProfesionalPublicSummaryResponse;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.photo.model.BusinessPhoto;
import com.plura.plurabackend.professional.photo.model.BusinessPhotoType;
import com.plura.plurabackend.professional.photo.repository.BusinessPhotoRepository;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDayDto;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalSchedulePauseDto;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleRangeDto;
import com.plura.plurabackend.professional.service.dto.ProfesionalServiceRequest;
import com.plura.plurabackend.professional.service.dto.ProfesionalServiceResponse;
import com.plura.plurabackend.professional.service.model.ProfesionalService;
import com.plura.plurabackend.professional.service.repository.ProfesionalServiceRepository;
import com.plura.plurabackend.search.engine.SearchSyncPublisher;
import com.plura.plurabackend.storage.ImageStorageService;
import com.plura.plurabackend.storage.thumbnail.ImageThumbnailJobService;
import com.plura.plurabackend.availability.ScheduleSummaryService;
import com.plura.plurabackend.user.model.User;
import com.plura.plurabackend.user.model.UserRole;
import com.plura.plurabackend.user.repository.UserRepository;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProfesionalPublicPageCoreService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ProfesionalPublicPageCoreService.class);

    private static final List<String> DAY_ORDER = List.of(
        "mon",
        "tue",
        "wed",
        "thu",
        "fri",
        "sat",
        "sun"
    );
    private static final Map<String, String> DAY_ALIASES = Map.ofEntries(
        Map.entry("monday", "mon"),
        Map.entry("tuesday", "tue"),
        Map.entry("wednesday", "wed"),
        Map.entry("thursday", "thu"),
        Map.entry("friday", "fri"),
        Map.entry("saturday", "sat"),
        Map.entry("sunday", "sun")
    );
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
    private static final int DEFAULT_SLOT_DURATION_MINUTES = 15;
    private static final HttpClient MAPBOX_HTTP_CLIENT = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(3))
        .build();
    private static final String MAPBOX_GEOCODING_ENDPOINT = "https://api.mapbox.com/geocoding/v5/mapbox.places/";
    private static final Set<Integer> ALLOWED_SLOT_DURATIONS = Set.of(
        10,
        15,
        20,
        25,
        30,
        35,
        40,
        45,
        50,
        55,
        60
    );
    private static final Map<String, String> LEGACY_CATEGORY_ALIASES = Map.ofEntries(
        Map.entry("peluqueria", "cabello"),
        Map.entry("cejas", "pestanas-cejas"),
        Map.entry("pestanas", "pestanas-cejas"),
        Map.entry("faciales", "estetica-facial")
    );

    private final ProfessionalProfileRepository professionalProfileRepository;
    private final BusinessPhotoRepository businessPhotoRepository;
    private final CategoryRepository categoryRepository;
    private final ProfesionalServiceRepository profesionalServiceRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final ZoneId systemZoneId;
    private final AvailableSlotService availableSlotService;
    private final AvailableSlotAsyncDispatcher availableSlotAsyncDispatcher;
    private final ScheduleSummaryService scheduleSummaryService;
    private final SlotCacheService slotCacheService;
    private final ProfileCacheService profileCacheService;
    private final SearchSyncPublisher searchSyncPublisher;
    private final ImageStorageService imageStorageService;
    private final MeterRegistry meterRegistry;
    private final PasswordEncoder passwordEncoder;
    private final ImageThumbnailJobService imageThumbnailJobService;
    private final String mapboxToken;

    public ProfesionalPublicPageCoreService(
        ProfessionalProfileRepository professionalProfileRepository,
        BusinessPhotoRepository businessPhotoRepository,
        CategoryRepository categoryRepository,
        ProfesionalServiceRepository profesionalServiceRepository,
        BookingRepository bookingRepository,
        UserRepository userRepository,
        @Value("${app.timezone:America/Montevideo}") String appTimezone,
        @Value("${app.mapbox.token:}") String mapboxToken,
        ObjectMapper objectMapper,
        AvailableSlotService availableSlotService,
        AvailableSlotAsyncDispatcher availableSlotAsyncDispatcher,
        ScheduleSummaryService scheduleSummaryService,
        SlotCacheService slotCacheService,
        ProfileCacheService profileCacheService,
        SearchSyncPublisher searchSyncPublisher,
        ImageStorageService imageStorageService,
        MeterRegistry meterRegistry,
        PasswordEncoder passwordEncoder,
        ImageThumbnailJobService imageThumbnailJobService
    ) {
        this.professionalProfileRepository = professionalProfileRepository;
        this.businessPhotoRepository = businessPhotoRepository;
        this.categoryRepository = categoryRepository;
        this.profesionalServiceRepository = profesionalServiceRepository;
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
        this.systemZoneId = ZoneId.of(appTimezone);
        this.mapboxToken = mapboxToken == null ? "" : mapboxToken.trim();
        this.availableSlotService = availableSlotService;
        this.availableSlotAsyncDispatcher = availableSlotAsyncDispatcher;
        this.scheduleSummaryService = scheduleSummaryService;
        this.slotCacheService = slotCacheService;
        this.profileCacheService = profileCacheService;
        this.searchSyncPublisher = searchSyncPublisher;
        this.imageStorageService = imageStorageService;
        this.meterRegistry = meterRegistry;
        this.passwordEncoder = passwordEncoder;
        this.imageThumbnailJobService = imageThumbnailJobService;
    }

    public ProfesionalPublicPageResponse getPublicPageBySlug(String slug) {
        var cached = profileCacheService.getPublicPageBySlug(slug);
        if (cached.isPresent()) {
            return cached.get();
        }
        ProfessionalProfile profile = professionalProfileRepository.findBySlug(slug)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrado"));
        ensurePublicProfessionalIsActive(profile);
        profile = ensurePublicCoordinates(profile);
        ProfesionalPublicPageResponse response = mapToPublicPage(profile);
        profileCacheService.putPublicPageBySlug(slug, response);
        return response;
    }

    public List<String> getAvailableSlots(String slug, String rawDate, String serviceId) {
        if (rawDate == null || rawDate.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La fecha es obligatoria");
        }
        if (serviceId == null || serviceId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El servicio es obligatorio");
        }

        LocalDate date;
        try {
            date = LocalDate.parse(rawDate.trim());
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Formato de fecha inválido");
        }

        ProfessionalProfile profile = professionalProfileRepository.findBySlug(slug)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrado"));
        ensureProfessionalReservable(profile);
        String slotCacheKey = buildSlotCacheKey(profile.getId(), rawDate.trim(), serviceId.trim());
        var cachedSlots = slotCacheService.getSlots(slotCacheKey);
        if (cachedSlots.isPresent()) {
            return cachedSlots.get();
        }

        ProfesionalService service = profesionalServiceRepository.findById(serviceId.trim())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Servicio no encontrado"));
        if (!service.getProfessional().getId().equals(profile.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Servicio no encontrado");
        }
        ensureServiceReservable(service);

        ProfesionalScheduleDto schedule = readStoredSchedule(profile.getScheduleJson());
        LocalDateTime now = nowInSystemZone();
        List<BookedWindow> bookedWindows = loadBookedWindows(profile, date);
        List<String> slots = calculateAvailableSlots(
            date,
            service,
            schedule,
            bookedWindows,
            now,
            resolveSlotDurationMinutes(profile.getSlotDurationMinutes())
        );
        slotCacheService.putSlots(slotCacheKey, slots);
        return slots;
    }

    @Transactional
    public PublicBookingResponse createPublicBooking(
        String slug,
        PublicBookingRequest request,
        String rawUserId
    ) {
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            Long userId = parseUserId(rawUserId);
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));
            if (user.getRole() != UserRole.USER) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo clientes pueden reservar");
            }

            // Lock pesimista: serializa reservas concurrentes para el mismo profesional.
            ProfessionalProfile profile = professionalProfileRepository.findBySlugForUpdate(slug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrado"));
            ensureProfessionalReservable(profile);

            ProfesionalService service = profesionalServiceRepository.findById(request.getServiceId().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Servicio no encontrado"));
            if (!service.getProfessional().getId().equals(profile.getId())) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Servicio no encontrado");
            }
            ensureServiceReservable(service);

            LocalDateTime startDateTime = parseClientDateTimeToSystemZone(request.getStartDateTime());

            if (startDateTime.getSecond() != 0 || startDateTime.getNano() != 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El slot debe venir en minutos exactos");
            }
            LocalDateTime now = nowInSystemZone();
            if (!startDateTime.isAfter(now)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La fecha de reserva debe ser futura");
            }

            LocalDate bookingDate = startDateTime.toLocalDate();
            String slotTime = startDateTime.toLocalTime().format(TIME_FORMATTER);
            ProfesionalScheduleDto schedule = readStoredSchedule(profile.getScheduleJson());
            List<BookedWindow> bookedWindows = loadBookedWindows(profile, bookingDate);
            List<String> availableSlots = calculateAvailableSlots(
                bookingDate,
                service,
                schedule,
                bookedWindows,
                now,
                resolveSlotDurationMinutes(profile.getSlotDurationMinutes())
            );
            if (!availableSlots.contains(slotTime)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El horario seleccionado no está disponible");
            }

            Booking booking = new Booking();
            booking.setUser(user);
            booking.setProfessional(profile);
            booking.setService(service);
            booking.setStartDateTime(startDateTime);
            booking.setStatus(BookingStatus.PENDING);
            booking.setCreatedAt(now);
            Booking saved = bookingRepository.saveAndFlush(booking);
            requestAvailabilityRebuildDay(profile.getId(), bookingDate);
            searchSyncPublisher.publishProfileChanged(profile.getId());
            evictSlotCacheForProfessional(profile.getId());
            profileCacheService.evictPublicPageBySlug(slug);
            profileCacheService.evictPublicSummaries();

            return new PublicBookingResponse(
                saved.getId(),
                saved.getStatus().name(),
                saved.getStartDateTime().toString(),
                saved.getService().getId(),
                String.valueOf(saved.getProfessional().getId()),
                String.valueOf(saved.getUser().getId())
            );
        } finally {
            sample.stop(
                Timer.builder("plura.booking.creation.time")
                    .description("Booking creation execution time")
                    .register(meterRegistry)
            );
        }
    }

    public List<ProfessionalBookingResponse> getProfessionalBookings(
        String rawUserId,
        String rawDate,
        String rawDateFrom,
        String rawDateTo
    ) {
        LocalDate dateFrom;
        LocalDate dateTo;
        if (rawDate != null && !rawDate.isBlank()) {
            if (
                (rawDateFrom != null && !rawDateFrom.isBlank())
                    || (rawDateTo != null && !rawDateTo.isBlank())
            ) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Usá date o dateFrom/dateTo, pero no ambos"
                );
            }
            dateFrom = parseDate(rawDate, "Formato de fecha inválido");
            dateTo = dateFrom;
        } else {
            if (rawDateFrom == null || rawDateFrom.isBlank() || rawDateTo == null || rawDateTo.isBlank()) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Debés enviar date o dateFrom/dateTo"
                );
            }
            dateFrom = parseDate(rawDateFrom, "Formato de dateFrom inválido");
            dateTo = parseDate(rawDateTo, "Formato de dateTo inválido");
            if (dateTo.isBefore(dateFrom)) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "dateTo debe ser mayor o igual a dateFrom"
                );
            }
        }

        ProfessionalProfile profile = loadProfessionalByUserId(rawUserId);
        LocalDateTime start = dateFrom.atStartOfDay();
        LocalDateTime end = dateTo.atTime(LocalTime.MAX);
        return bookingRepository.findProfessionalBookingResponsesByProfessionalAndStartDateTimeBetween(
            profile,
            start,
            end
        );
    }

    @Transactional
    public ProfessionalBookingResponse createProfessionalBooking(
        String rawUserId,
        ProfessionalBookingCreateRequest request
    ) {
        ProfessionalProfile profile = loadProfessionalByUserId(rawUserId);
        ensureProfessionalReservable(profile);
        ensureSlug(profile);
        if (profile.getSlug() == null || profile.getSlug().isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "No se pudo generar el slug del profesional"
            );
        }

        Long clientUserId = resolveOrCreateManualClient(request);

        PublicBookingRequest bookingRequest = new PublicBookingRequest();
        bookingRequest.setServiceId(request.getServiceId().trim());
        bookingRequest.setStartDateTime(request.getStartDateTime().trim());

        PublicBookingResponse created = createPublicBooking(
            profile.getSlug(),
            bookingRequest,
            String.valueOf(clientUserId)
        );

        Booking booking = bookingRepository.findById(created.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no encontrada"));

        if (booking.getStatus() == BookingStatus.PENDING) {
            booking.setStatus(BookingStatus.CONFIRMED);
            booking = bookingRepository.save(booking);
        }

        return mapProfessionalBooking(booking);
    }

    @Transactional
    public ProfessionalBookingResponse updateProfessionalBooking(
        String rawUserId,
        Long bookingId,
        ProfessionalBookingUpdateRequest request
    ) {
        ProfessionalProfile profile = loadProfessionalByUserId(rawUserId);

        Booking booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reserva no encontrada"));

        if (!booking.getProfessional().getId().equals(profile.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");
        }

        validateBookingStatusTransition(booking.getStatus(), request.getStatus());
        booking.setStatus(request.getStatus());
        Booking saved = bookingRepository.save(booking);
        requestAvailabilityRebuildDay(profile.getId(), saved.getStartDateTime().toLocalDate());
        searchSyncPublisher.publishProfileChanged(profile.getId());
        if (profile.getSlug() != null && !profile.getSlug().isBlank()) {
            evictSlotCacheForProfessional(profile.getId());
            profileCacheService.evictPublicPageBySlug(profile.getSlug());
        }
        profileCacheService.evictPublicSummaries();
        return mapProfessionalBooking(saved);
    }

    public List<ProfesionalPublicSummaryResponse> listPublicProfessionals(
        Integer limit,
        UUID categoryId,
        String categorySlug
    ) {
        String normalizedCategorySlug = categorySlug == null
            ? null
            : categorySlug.trim().toLowerCase(Locale.ROOT);
        String cacheKey = buildPublicSummaryCacheKey(limit, categoryId, normalizedCategorySlug);
        var cached = profileCacheService.getPublicSummaries(cacheKey);
        if (cached.isPresent()) {
            return cached.get();
        }

        int effectiveLimit = (limit != null && limit > 0) ? limit : Integer.MAX_VALUE;
        int pageSize = (limit != null && limit > 0) ? Math.min(limit, 200) : 200;
        int currentPage = 0;
        List<ProfessionalProfile> profiles = new ArrayList<>();

        while (profiles.size() < effectiveLimit) {
            Page<Long> idsPage = professionalProfileRepository.findActiveIdsForPublicListing(
                categoryId,
                normalizedCategorySlug,
                PageRequest.of(currentPage, pageSize)
            );
            if (idsPage.isEmpty()) {
                break;
            }
            List<Long> ids = idsPage.getContent();
            List<ProfessionalProfile> fetchedProfiles = professionalProfileRepository.findByIdInAndActiveTrueWithRelations(
                ids
            );
            Map<Long, ProfessionalProfile> byId = fetchedProfiles.stream()
                .collect(Collectors.toMap(ProfessionalProfile::getId, profile -> profile));
            for (Long id : ids) {
                ProfessionalProfile profile = byId.get(id);
                if (profile != null) {
                    profiles.add(profile);
                }
                if (profiles.size() >= effectiveLimit) {
                    break;
                }
            }
            if (!idsPage.hasNext()) {
                break;
            }
            currentPage++;
        }

        List<ProfessionalProfile> toUpdate = new ArrayList<>();
        profiles.forEach(profile -> {
            if (profile.getSlug() == null || profile.getSlug().isBlank()) {
                ensureSlug(profile);
                toUpdate.add(profile);
            }
        });
        if (!toUpdate.isEmpty()) {
            professionalProfileRepository.saveAll(toUpdate);
        }

        List<ProfesionalPublicSummaryResponse> response = profiles.stream()
            .map(this::mapToSummary)
            .collect(Collectors.toList());
        profileCacheService.putPublicSummaries(cacheKey, response);
        return response;
    }

    public ProfesionalPublicPageResponse getPublicPageByProfesionalId(String rawUserId) {
        ProfessionalProfile profile = loadProfessionalByUserId(rawUserId);
        ensureSlug(profile);
        profile = ensurePublicCoordinates(profile);
        return mapToPublicPage(profile);
    }

    @Transactional
    public ProfesionalPublicPageResponse updatePublicPage(
        String rawUserId,
        ProfesionalPublicPageUpdateRequest request
    ) {
        ProfessionalProfile profile = loadProfessionalByUserId(rawUserId);

        if (request.getHeadline() != null) {
            profile.setPublicHeadline(request.getHeadline().trim());
        }
        if (request.getAbout() != null) {
            profile.setPublicAbout(request.getAbout().trim());
        }
        if (request.getPhotos() != null) {
            List<String> cleaned = request.getPhotos().stream()
                .map(photo -> photo == null ? "" : photo.trim())
                .filter(photo -> !photo.isBlank())
                .collect(Collectors.toList());
            profile.getPublicPhotos().clear();
            profile.getPublicPhotos().addAll(cleaned);
            syncLocalBusinessPhotos(profile, cleaned);
            cleaned.stream()
                .map(this::extractStorageObjectKey)
                .forEach(imageThumbnailJobService::generateThumbnailsAsync);
        }

        ensureSlug(profile);
        profile = professionalProfileRepository.save(profile);
        profileCacheService.evictPublicPageBySlug(profile.getSlug());
        profileCacheService.evictPublicSummaries();
        searchSyncPublisher.publishProfileChanged(profile.getId());

        return mapToPublicPage(profile);
    }

    @Transactional
    public void updateBusinessProfile(
        String rawUserId,
        ProfesionalBusinessProfileUpdateRequest request
    ) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payload inválido");
        }
        Double requestedLatitude = normalizeLatitude(request.getLatitude());
        Double requestedLongitude = normalizeLongitude(request.getLongitude());
        validateCoordinatesPair(requestedLatitude, requestedLongitude);

        ProfessionalProfile profile = loadProfessionalByUserId(rawUserId);
        User user = profile.getUser();

        if (request.getFullName() != null) {
            String fullName = request.getFullName().trim();
            if (fullName.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre no puede estar vacío");
            }
            user.setFullName(fullName);
            profile.setDisplayName(fullName);
        }

        if (request.getPhoneNumber() != null) {
            String phone = request.getPhoneNumber().trim();
            if (phone.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El teléfono no puede estar vacío");
            }
            user.setPhoneNumber(phone);
        }

        if (request.getCategorySlugs() != null) {
            Set<Category> categories = resolveCategoriesBySlugs(request.getCategorySlugs());
            applyCategories(profile, categories);
        } else if (request.getRubro() != null) {
            String rubro = request.getRubro().trim();
            if (rubro.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El rubro no puede estar vacío");
            }
            String mappedSlug = mapLegacyCategorySlug(SlugUtils.toSlug(rubro));
            Category category = categoryRepository.findBySlug(mappedSlug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rubro inválido"));
            applyCategories(profile, Set.of(category));
        }

        if (request.getLocation() != null) {
            String location = request.getLocation().trim();
            if (location.isBlank()) {
                profile.setLocation(null);
                profile.setLocationText(null);
                profile.setLatitude(null);
                profile.setLongitude(null);
            } else {
                if (requestedLatitude == null || requestedLongitude == null) {
                    throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "No se pudo geocodificar la ubicación"
                    );
                }
                profile.setLocation(location);
                profile.setLocationText(location);
                profile.setLatitude(requestedLatitude);
                profile.setLongitude(requestedLongitude);
            }
        }

        if (request.getLogoUrl() != null) {
            String logoUrl = request.getLogoUrl().trim();
            profile.setLogoUrl(logoUrl.isBlank() ? null : logoUrl);
            if (!logoUrl.isBlank()) {
                imageThumbnailJobService.generateThumbnailsAsync(extractStorageObjectKey(logoUrl));
            }
        }

        userRepository.save(user);
        profile = professionalProfileRepository.save(profile);
        professionalProfileRepository.updateCoordinates(
            profile.getId(),
            profile.getLatitude(),
            profile.getLongitude()
        );
        if (profile.getSlug() != null && !profile.getSlug().isBlank()) {
            profileCacheService.evictPublicPageBySlug(profile.getSlug());
            evictSlotCacheForProfessional(profile.getId());
        }
        profileCacheService.evictPublicSummaries();
        searchSyncPublisher.publishProfileChanged(profile.getId());
    }

    public ProfesionalScheduleDto getSchedule(String rawUserId) {
        ProfessionalProfile profile = loadProfessionalByUserId(rawUserId);
        ProfesionalScheduleDto schedule = readStoredSchedule(profile.getScheduleJson());
        schedule.setSlotDurationMinutes(resolveSlotDurationMinutes(profile.getSlotDurationMinutes()));
        return schedule;
    }

    @Transactional
    public ProfesionalScheduleDto updateSchedule(
        String rawUserId,
        ProfesionalScheduleDto request
    ) {
        ProfessionalProfile profile = loadProfessionalByUserId(rawUserId);

        validateSchedule(request);
        ProfesionalScheduleDto normalized = normalizeSchedule(request);
        int slotDurationMinutes = sanitizeSlotDurationMinutes(
            request.getSlotDurationMinutes(),
            profile.getSlotDurationMinutes()
        );
        normalized.setSlotDurationMinutes(slotDurationMinutes);
        profile.setSlotDurationMinutes(slotDurationMinutes);

        try {
            profile.setScheduleJson(objectMapper.writeValueAsString(normalized));
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "No se pudo guardar el horario"
            );
        }

        professionalProfileRepository.save(profile);
        requestAvailabilityRebuild(profile.getId(), 30);
        searchSyncPublisher.publishProfileChanged(profile.getId());
        if (profile.getSlug() != null && !profile.getSlug().isBlank()) {
            evictSlotCacheForProfessional(profile.getId());
            profileCacheService.evictPublicPageBySlug(profile.getSlug());
        }
        profileCacheService.evictPublicSummaries();
        return normalized;
    }

    public List<ProfesionalServiceResponse> listServices(String rawUserId) {
        ProfessionalProfile profile = loadProfessionalByUserId(rawUserId);
        return profesionalServiceRepository.findByProfessional_IdOrderByCreatedAtDesc(profile.getId())
            .stream()
            .map(this::mapService)
            .toList();
    }

    public ProfesionalServiceResponse createService(String rawUserId, ProfesionalServiceRequest request) {
        ProfessionalProfile profile = loadProfessionalByUserId(rawUserId);

        ProfesionalService service = new ProfesionalService();
        service.setProfessional(profile);
        service.setName(request.getName() == null ? null : request.getName().trim());
        service.setDescription(normalizeOptional(request.getDescription()));
        service.setPrice(request.getPrice() == null ? null : request.getPrice().toPlainString());
        service.setDuration(request.getDuration() == null ? null : request.getDuration().trim());
        service.setImageUrl(normalizeOptional(request.getImageUrl()));
        service.setPostBufferMinutes(sanitizePostBufferMinutes(request.getPostBufferMinutes()));
        service.setActive(request.getActive() == null ? true : request.getActive());

        ProfesionalService saved = profesionalServiceRepository.save(service);
        requestAvailabilityRebuild(profile.getId(), 30);
        searchSyncPublisher.publishProfileChanged(profile.getId());
        if (profile.getSlug() != null && !profile.getSlug().isBlank()) {
            profileCacheService.evictPublicPageBySlug(profile.getSlug());
            evictSlotCacheForProfessional(profile.getId());
        }
        profileCacheService.evictPublicSummaries();
        return mapService(saved);
    }

    public ProfesionalServiceResponse updateService(
        String rawUserId,
        String serviceId,
        ProfesionalServiceRequest request
    ) {
        ProfessionalProfile profile = loadProfessionalByUserId(rawUserId);

        ProfesionalService service = profesionalServiceRepository.findById(serviceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Servicio no encontrado"));

        if (!service.getProfessional().getId().equals(profile.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");
        }

        if (request.getName() != null) {
            service.setName(request.getName().trim());
        }
        if (request.getDescription() != null) {
            service.setDescription(normalizeOptional(request.getDescription()));
        }
        if (request.getPrice() != null) {
            service.setPrice(request.getPrice().toPlainString());
        }
        if (request.getDuration() != null) {
            service.setDuration(request.getDuration().trim());
        }
        if (request.getImageUrl() != null) {
            service.setImageUrl(normalizeOptional(request.getImageUrl()));
        }
        if (request.getPostBufferMinutes() != null) {
            service.setPostBufferMinutes(sanitizePostBufferMinutes(request.getPostBufferMinutes()));
        }
        if (request.getActive() != null) {
            service.setActive(request.getActive());
        }

        ProfesionalService saved = profesionalServiceRepository.save(service);
        requestAvailabilityRebuild(profile.getId(), 30);
        searchSyncPublisher.publishProfileChanged(profile.getId());
        if (profile.getSlug() != null && !profile.getSlug().isBlank()) {
            profileCacheService.evictPublicPageBySlug(profile.getSlug());
            evictSlotCacheForProfessional(profile.getId());
        }
        profileCacheService.evictPublicSummaries();
        return mapService(saved);
    }

    public void deleteService(String rawUserId, String serviceId) {
        ProfessionalProfile profile = loadProfessionalByUserId(rawUserId);

        ProfesionalService service = profesionalServiceRepository.findById(serviceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Servicio no encontrado"));

        if (!service.getProfessional().getId().equals(profile.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");
        }

        profesionalServiceRepository.delete(service);
        requestAvailabilityRebuild(profile.getId(), 30);
        searchSyncPublisher.publishProfileChanged(profile.getId());
        if (profile.getSlug() != null && !profile.getSlug().isBlank()) {
            profileCacheService.evictPublicPageBySlug(profile.getSlug());
            evictSlotCacheForProfessional(profile.getId());
        }
        profileCacheService.evictPublicSummaries();
    }

    private void requestAvailabilityRebuild(Long professionalId, int days) {
        if (professionalId == null) {
            return;
        }
        try {
            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        try {
                            availableSlotAsyncDispatcher.rebuildProfessionalNextDays(professionalId, days);
                            scheduleSummaryService.requestRebuild(professionalId);
                        } catch (RuntimeException exception) {
                            LOGGER.warn(
                                "No se pudo encolar rebuild async para profesional {} afterCommit",
                                professionalId,
                                exception
                            );
                        }
                    }
                });
                return;
            }
            availableSlotAsyncDispatcher.rebuildProfessionalNextDays(professionalId, days);
            scheduleSummaryService.requestRebuild(professionalId);
        } catch (RuntimeException exception) {
            LOGGER.warn(
                "No se pudo encolar rebuild async para profesional {}",
                professionalId,
                exception
            );
        }
    }

    private void requestAvailabilityRebuildDay(Long professionalId, LocalDate date) {
        if (professionalId == null || date == null) {
            return;
        }
        try {
            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        try {
                            availableSlotAsyncDispatcher.rebuildProfessionalDay(professionalId, date);
                            scheduleSummaryService.requestRebuild(professionalId);
                        } catch (RuntimeException exception) {
                            LOGGER.warn(
                                "No se pudo encolar rebuild async del día {} para profesional {} afterCommit",
                                date,
                                professionalId,
                                exception
                            );
                        }
                    }
                });
                return;
            }
            availableSlotAsyncDispatcher.rebuildProfessionalDay(professionalId, date);
            scheduleSummaryService.requestRebuild(professionalId);
        } catch (RuntimeException exception) {
            LOGGER.warn(
                "No se pudo encolar rebuild async del día {} para profesional {}",
                date,
                professionalId,
                exception
            );
        }
    }

    private ProfessionalProfile loadProfessionalByUserId(String rawUserId) {
        Long userId = parseUserId(rawUserId);
        return professionalProfileRepository.findByUser_Id(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrado"));
    }

    private Long parseUserId(String rawUserId) {
        try {
            return Long.valueOf(rawUserId);
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesión inválida");
        }
    }

    private LocalDate parseDate(String rawDate, String errorMessage) {
        try {
            return LocalDate.parse(rawDate.trim());
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, errorMessage);
        }
    }

    private String buildSlotCacheKey(Long professionalId, String date, String serviceId) {
        return "slots:" + professionalId + ":" + date + ":" + serviceId;
    }

    private String buildPublicSummaryCacheKey(Integer limit, UUID categoryId, String categorySlug) {
        return "limit=" + (limit == null ? "" : limit)
            + "|categoryId=" + (categoryId == null ? "" : categoryId)
            + "|categorySlug=" + (categorySlug == null ? "" : categorySlug);
    }

    private String extractStorageObjectKey(String urlOrKey) {
        if (urlOrKey == null || urlOrKey.isBlank()) {
            return "";
        }
        String value = urlOrKey.trim();
        if (value.startsWith("r2://")) {
            String withoutScheme = value.substring("r2://".length()).replaceFirst("^/+", "");
            int slash = withoutScheme.indexOf('/');
            return slash >= 0 ? withoutScheme.substring(slash + 1) : withoutScheme;
        }
        if (value.startsWith("r2:")) {
            return value.substring("r2:".length()).replaceFirst("^/+", "");
        }
        int queryIndex = value.indexOf('?');
        if (queryIndex >= 0) {
            value = value.substring(0, queryIndex);
        }
        int pathStart = value.indexOf('/', value.indexOf("://") + 3);
        if (pathStart >= 0 && value.startsWith("http")) {
            return value.substring(pathStart + 1);
        }
        int slash = value.lastIndexOf('/');
        if (slash >= 0 && slash + 1 < value.length()) {
            return value.substring(slash + 1);
        }
        return value;
    }

    private void evictSlotCacheForProfessional(Long professionalId) {
        if (professionalId == null) {
            return;
        }
        slotCacheService.evictByPrefix("slots:" + professionalId + ":");
    }

    private void validateCoordinatesPair(Double latitude, Double longitude) {
        if ((latitude == null) == (longitude == null)) {
            return;
        }
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "latitude y longitude deben enviarse juntas"
        );
    }

    private Double normalizeLatitude(Double rawLatitude) {
        if (rawLatitude == null) {
            return null;
        }
        if (rawLatitude < -90d || rawLatitude > 90d) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "latitude fuera de rango");
        }
        return rawLatitude;
    }

    private Double normalizeLongitude(Double rawLongitude) {
        if (rawLongitude == null) {
            return null;
        }
        if (rawLongitude < -180d || rawLongitude > 180d) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "longitude fuera de rango");
        }
        return rawLongitude;
    }

    private List<BookedWindow> loadBookedWindows(ProfessionalProfile profile, LocalDate date) {
        LocalDateTime dayStart = date.atStartOfDay();
        LocalDateTime dayEnd = date.atTime(LocalTime.MAX);
        return bookingRepository.findBookedWithServiceByProfessionalAndStartDateTimeBetween(
                profile,
                dayStart,
                dayEnd,
                BookingStatus.CANCELLED
            )
            .stream()
            .map(booking -> {
                LocalDateTime start = booking.getStartDateTime();
                int effectiveDurationMinutes = resolveEffectiveDurationMinutes(booking.getService());
                return new BookedWindow(start, start.plusMinutes(effectiveDurationMinutes));
            })
            .toList();
    }

    private List<String> calculateAvailableSlots(
        LocalDate date,
        ProfesionalService service,
        ProfesionalScheduleDto schedule,
        List<BookedWindow> bookedWindows,
        LocalDateTime now,
        int slotDurationMinutes
    ) {
        if (date.isBefore(now.toLocalDate()) || isDatePaused(date, schedule.getPauses())) {
            return List.of();
        }

        String dayKey = dayKeyFromDate(date);
        ProfesionalScheduleDayDto daySchedule = schedule.getDays().stream()
            .filter(day -> day != null && dayKey.equalsIgnoreCase(day.getDay()))
            .findFirst()
            .orElse(null);
        if (
            daySchedule == null
                || !daySchedule.isEnabled()
                || daySchedule.isPaused()
                || daySchedule.getRanges() == null
                || daySchedule.getRanges().isEmpty()
        ) {
            return List.of();
        }

        int effectiveDurationMinutes = resolveEffectiveDurationMinutes(service);
        Set<String> slots = new LinkedHashSet<>();
        List<ProfesionalScheduleRangeDto> sortedRanges = new ArrayList<>(daySchedule.getRanges());
        sortedRanges.sort(Comparator.comparing(range -> parseTime(range.getStart())));

        for (ProfesionalScheduleRangeDto range : sortedRanges) {
            if (range == null) continue;

            LocalTime rangeStart;
            LocalTime rangeEnd;
            try {
                rangeStart = LocalTime.parse(range.getStart());
                rangeEnd = LocalTime.parse(range.getEnd());
            } catch (Exception exception) {
                continue;
            }

            if (!rangeStart.isBefore(rangeEnd)) {
                continue;
            }

            LocalDateTime slotStart = date.atTime(rangeStart);
            LocalDateTime rangeEndDateTime = date.atTime(rangeEnd);

            while (!slotStart.plusMinutes(effectiveDurationMinutes).isAfter(rangeEndDateTime)) {
                LocalDateTime slotEnd = slotStart.plusMinutes(effectiveDurationMinutes);
                if (slotStart.isAfter(now) && !hasOverlap(bookedWindows, slotStart, slotEnd)) {
                    LocalTime slotTime = slotStart.toLocalTime();
                    slots.add(slotTime.format(TIME_FORMATTER));
                }
                slotStart = slotStart.plusMinutes(slotDurationMinutes);
            }
        }

        return slots.stream().sorted().toList();
    }

    private ProfesionalScheduleDto readStoredSchedule(String rawScheduleJson) {
        if (rawScheduleJson == null || rawScheduleJson.isBlank()) {
            return createDefaultSchedule();
        }

        try {
            ProfesionalScheduleDto parsed = objectMapper.readValue(rawScheduleJson, ProfesionalScheduleDto.class);
            return normalizeSchedule(parsed);
        } catch (JsonProcessingException exception) {
            return createDefaultSchedule();
        }
    }

    private ProfesionalScheduleDto createDefaultSchedule() {
        List<ProfesionalScheduleDayDto> days = new ArrayList<>();
        DAY_ORDER.forEach(day -> days.add(new ProfesionalScheduleDayDto(day, false, false, new ArrayList<>())));
        return new ProfesionalScheduleDto(days, new ArrayList<>(), DEFAULT_SLOT_DURATION_MINUTES);
    }

    private ProfesionalScheduleDto normalizeSchedule(ProfesionalScheduleDto source) {
        if (source == null) {
            return createDefaultSchedule();
        }

        List<ProfesionalScheduleDayDto> sourceDays = source.getDays() == null
            ? new ArrayList<>()
            : source.getDays();
        Map<String, ProfesionalScheduleDayDto> byDay = new LinkedHashMap<>();
        sourceDays.forEach(day -> {
            if (day == null || day.getDay() == null) return;
            String key = normalizeDayKey(day.getDay());
            if (key.isBlank()) return;
            byDay.put(key, day);
        });

        List<ProfesionalScheduleDayDto> normalizedDays = new ArrayList<>();
        for (String dayKey : DAY_ORDER) {
            ProfesionalScheduleDayDto sourceDay = byDay.get(dayKey);
            boolean enabled = sourceDay != null && sourceDay.isEnabled();
            boolean paused = sourceDay != null && sourceDay.isPaused();

            List<ProfesionalScheduleRangeDto> sourceRanges = sourceDay != null && sourceDay.getRanges() != null
                ? sourceDay.getRanges()
                : List.of();

            List<ProfesionalScheduleRangeDto> normalizedRanges = new ArrayList<>();
            for (ProfesionalScheduleRangeDto range : sourceRanges) {
                if (range == null) continue;
                String start = range.getStart() == null ? "" : range.getStart().trim();
                String end = range.getEnd() == null ? "" : range.getEnd().trim();
                normalizedRanges.add(
                    new ProfesionalScheduleRangeDto(
                        range.getId() == null || range.getId().isBlank()
                            ? "range-" + dayKey + "-" + UUID.randomUUID()
                            : range.getId().trim(),
                        start,
                        end
                    )
                );
            }

            normalizedDays.add(new ProfesionalScheduleDayDto(dayKey, enabled, paused, normalizedRanges));
        }

        List<ProfesionalSchedulePauseDto> sourcePauses = source.getPauses() == null
            ? List.of()
            : source.getPauses();
        List<ProfesionalSchedulePauseDto> normalizedPauses = new ArrayList<>();
        for (ProfesionalSchedulePauseDto pause : sourcePauses) {
            if (pause == null) continue;
            String startDate = pause.getStartDate() == null ? "" : pause.getStartDate().trim();
            if (startDate.isBlank()) continue;
            String endDate = pause.getEndDate() == null || pause.getEndDate().isBlank()
                ? startDate
                : pause.getEndDate().trim();
            normalizedPauses.add(
                new ProfesionalSchedulePauseDto(
                    pause.getId() == null || pause.getId().isBlank()
                        ? "pause-" + UUID.randomUUID()
                        : pause.getId().trim(),
                    startDate,
                    endDate,
                    pause.getNote() == null ? "" : pause.getNote().trim()
                )
            );
        }

        return new ProfesionalScheduleDto(
            normalizedDays,
            normalizedPauses,
            normalizeSlotDurationOrDefault(source.getSlotDurationMinutes())
        );
    }

    private void validateSchedule(ProfesionalScheduleDto schedule) {
        if (schedule == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Horario inválido");
        }
        if (schedule.getSlotDurationMinutes() != null) {
            validateSlotDuration(schedule.getSlotDurationMinutes());
        }
        if (schedule.getDays() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debés enviar los días del horario");
        }

        Set<String> seenDays = new HashSet<>();
        for (ProfesionalScheduleDayDto day : schedule.getDays()) {
            if (day == null || day.getDay() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Día inválido en horario");
            }
            String dayKey = normalizeDayKey(day.getDay());
            if (!DAY_ORDER.contains(dayKey)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Día inválido: " + day.getDay());
            }
            if (!seenDays.add(dayKey)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Día duplicado: " + day.getDay());
            }
            validateDayRanges(dayKey, day.getRanges());
        }

        validatePauses(schedule.getPauses());
    }

    private String normalizeDayKey(String rawDay) {
        if (rawDay == null) {
            return "";
        }
        String normalized = rawDay.trim().toLowerCase();
        if (normalized.isBlank()) {
            return "";
        }
        return DAY_ALIASES.getOrDefault(normalized, normalized);
    }

    private void validateDayRanges(String day, List<ProfesionalScheduleRangeDto> ranges) {
        if (ranges == null) return;

        List<RangeWindow> windows = new ArrayList<>();
        for (ProfesionalScheduleRangeDto range : ranges) {
            if (range == null) continue;

            String startRaw = range.getStart() == null ? "" : range.getStart().trim();
            String endRaw = range.getEnd() == null ? "" : range.getEnd().trim();

            if (startRaw.isBlank() || endRaw.isBlank()) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Cada franja debe incluir inicio y fin (" + day + ")"
                );
            }

            LocalTime start;
            LocalTime end;
            try {
                start = LocalTime.parse(startRaw);
                end = LocalTime.parse(endRaw);
            } catch (DateTimeParseException exception) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Formato de hora inválido (" + day + ")"
                );
            }

            if (!start.isBefore(end)) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El horario de inicio debe ser menor al de fin (" + day + ")"
                );
            }

            windows.add(new RangeWindow(start, end));
        }

        windows.sort(Comparator.comparing(window -> window.start));
        for (int index = 1; index < windows.size(); index++) {
            RangeWindow previous = windows.get(index - 1);
            RangeWindow current = windows.get(index);
            if (current.start.isBefore(previous.end)) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Hay franjas solapadas en " + day
                );
            }
        }
    }

    private void validatePauses(List<ProfesionalSchedulePauseDto> pauses) {
        if (pauses == null) return;

        List<PauseWindow> windows = new ArrayList<>();
        for (ProfesionalSchedulePauseDto pause : pauses) {
            if (pause == null) continue;

            String startRaw = pause.getStartDate() == null ? "" : pause.getStartDate().trim();
            if (startRaw.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cada pausa debe tener fecha de inicio");
            }
            String endRaw = pause.getEndDate() == null || pause.getEndDate().isBlank()
                ? startRaw
                : pause.getEndDate().trim();

            LocalDate start;
            LocalDate end;
            try {
                start = LocalDate.parse(startRaw);
                end = LocalDate.parse(endRaw);
            } catch (DateTimeParseException exception) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Formato de pausa inválido");
            }

            if (end.isBefore(start)) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La pausa finaliza antes de empezar"
                );
            }

            windows.add(new PauseWindow(start, end));
        }

        windows.sort(Comparator.comparing(window -> window.start));
        for (int index = 1; index < windows.size(); index++) {
            PauseWindow previous = windows.get(index - 1);
            PauseWindow current = windows.get(index);
            if (!current.start.isAfter(previous.end)) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Las pausas no deben solaparse"
                );
            }
        }
    }

    private record RangeWindow(LocalTime start, LocalTime end) {}

    private record PauseWindow(LocalDate start, LocalDate end) {}

    private record BookedWindow(LocalDateTime start, LocalDateTime end) {}

    private ProfesionalPublicPageResponse mapToPublicPage(ProfessionalProfile profile) {
        User user = profile.getUser();
        ProfesionalScheduleDto schedule = readStoredSchedule(profile.getScheduleJson());
        schedule.setSlotDurationMinutes(resolveSlotDurationMinutes(profile.getSlotDurationMinutes()));
        List<ProfesionalServiceResponse> services = profesionalServiceRepository
            .findByProfessional_IdOrderByCreatedAtDesc(profile.getId())
            .stream()
            .filter(this::isServiceActive)
            .map(this::mapPublicService)
            .collect(Collectors.toList());
        List<String> galleryPhotos = resolvePublicGalleryPhotos(profile, services);

        return new ProfesionalPublicPageResponse(
            String.valueOf(profile.getId()),
            profile.getSlug(),
            user.getFullName(),
            resolvePrimaryRubro(profile),
            profile.getPublicHeadline(),
            profile.getPublicAbout(),
            normalizePublicPhotoUrl(profile.getLogoUrl()),
            profile.getLocation(),
            profile.getLatitude(),
            profile.getLongitude(),
            mapCategories(profile.getCategories()),
            galleryPhotos,
            schedule,
            services
        );
    }

    private void syncLocalBusinessPhotos(ProfessionalProfile profile, List<String> cleanedPhotoUrls) {
        businessPhotoRepository.deleteByProfessional_IdAndType(profile.getId(), BusinessPhotoType.LOCAL);
        if (cleanedPhotoUrls.isEmpty()) {
            return;
        }

        List<BusinessPhoto> localPhotos = cleanedPhotoUrls.stream()
            .map(url -> {
                BusinessPhoto photo = new BusinessPhoto();
                photo.setProfessional(profile);
                photo.setUrl(url);
                photo.setType(BusinessPhotoType.LOCAL);
                return photo;
            })
            .collect(Collectors.toList());
        businessPhotoRepository.saveAll(localPhotos);
    }

    private List<String> resolvePublicGalleryPhotos(
        ProfessionalProfile profile,
        List<ProfesionalServiceResponse> services
    ) {
        LinkedHashSet<String> photoUrls = new LinkedHashSet<>();
        List<BusinessPhotoType> galleryTypes = List.of(
            BusinessPhotoType.LOCAL,
            BusinessPhotoType.WORK,
            BusinessPhotoType.SERVICE
        );
        List<BusinessPhoto> businessPhotos = businessPhotoRepository
            .findByProfessional_IdAndTypeInOrderByCreatedAtAsc(profile.getId(), galleryTypes);
        businessPhotos.stream()
            .map(BusinessPhoto::getUrl)
            .map(this::normalizePublicPhotoUrl)
            .filter(photo -> photo != null)
            .forEach(photoUrls::add);

        if (photoUrls.isEmpty()) {
            profile.getPublicPhotos().stream()
                .map(this::normalizePublicPhotoUrl)
                .filter(photo -> photo != null)
                .forEach(photoUrls::add);
        }

        services.stream()
            .map(ProfesionalServiceResponse::getImageUrl)
            .map(this::normalizePublicPhotoUrl)
            .filter(photo -> photo != null)
            .forEach(photoUrls::add);

        return List.copyOf(photoUrls);
    }

    private String normalizePublicPhotoUrl(String rawUrl) {
        if (rawUrl == null) {
            return null;
        }
        String cleaned = rawUrl.trim();
        if (cleaned.isBlank()) {
            return null;
        }
        return imageStorageService.resolvePublicUrl(cleaned);
    }

    private ProfessionalProfile ensurePublicCoordinates(ProfessionalProfile profile) {
        if (profile == null) return null;
        if (profile.getLatitude() != null && profile.getLongitude() != null) {
            return profile;
        }

        String location = profile.getLocationText();
        if (location == null || location.isBlank()) {
            location = profile.getLocation();
        }
        if (location == null || location.isBlank()) {
            return profile;
        }
        if (mapboxToken.isBlank()) {
            return profile;
        }

        final String locationToGeocode = location;
        final Long profileId = profile.getId();
        CompletableFuture.runAsync(() -> {
            Coordinates coordinates = geocodeLocation(locationToGeocode);
            if (coordinates != null) {
                professionalProfileRepository.updateCoordinates(
                    profileId,
                    coordinates.latitude(),
                    coordinates.longitude()
                );
            }
        });
        return profile;
    }

    private Coordinates geocodeLocation(String rawLocation) {
        try {
            String encodedLocation = URLEncoder.encode(rawLocation.trim(), StandardCharsets.UTF_8);
            String encodedToken = URLEncoder.encode(mapboxToken, StandardCharsets.UTF_8);
            URI endpoint = URI.create(
                MAPBOX_GEOCODING_ENDPOINT + encodedLocation + ".json"
                    + "?access_token=" + encodedToken
                    + "&limit=1"
                    + "&autocomplete=true"
                    + "&types=address,place,locality,neighborhood"
                    + "&language=es"
                    + "&country=uy,ar"
            );

            HttpRequest request = HttpRequest.newBuilder(endpoint)
                .GET()
                .timeout(Duration.ofSeconds(5))
                .header("Accept", "application/json")
                .build();

            HttpResponse<String> response = MAPBOX_HTTP_CLIENT.send(
                request,
                HttpResponse.BodyHandlers.ofString()
            );
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return null;
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> payload = objectMapper.readValue(response.body(), Map.class);
            Object featuresValue = payload.get("features");
            if (!(featuresValue instanceof List<?> features) || features.isEmpty()) {
                return null;
            }

            Object firstFeature = features.get(0);
            if (!(firstFeature instanceof Map<?, ?> featureMap)) {
                return null;
            }

            Object centerValue = featureMap.get("center");
            if (!(centerValue instanceof List<?> center) || center.size() < 2) {
                return null;
            }

            Double longitude = toDouble(center.get(0));
            Double latitude = toDouble(center.get(1));
            if (latitude == null || longitude == null) {
                return null;
            }
            if (
                latitude < -90d
                    || latitude > 90d
                    || longitude < -180d
                    || longitude > 180d
            ) {
                return null;
            }

            return new Coordinates(latitude, longitude);
        } catch (Exception exception) {
            LOGGER.debug("No se pudo geocodificar ubicación '{}'", rawLocation, exception);
            return null;
        }
    }

    private Double toDouble(Object value) {
        if (value instanceof Number number) {
            double parsed = number.doubleValue();
            return Double.isFinite(parsed) ? parsed : null;
        }
        if (value instanceof String stringValue) {
            try {
                double parsed = Double.parseDouble(stringValue.trim());
                return Double.isFinite(parsed) ? parsed : null;
            } catch (NumberFormatException exception) {
                return null;
            }
        }
        return null;
    }

    private record Coordinates(Double latitude, Double longitude) {}

    private ProfesionalServiceResponse mapService(ProfesionalService service) {
        return new ProfesionalServiceResponse(
            service.getId(),
            service.getName(),
            service.getDescription(),
            service.getPrice(),
            service.getDuration(),
            normalizePublicPhotoUrl(service.getImageUrl()),
            resolvePostBufferMinutes(service),
            service.getActive()
        );
    }

    private ProfesionalServiceResponse mapPublicService(ProfesionalService service) {
        return new ProfesionalServiceResponse(
            service.getId(),
            service.getName(),
            service.getDescription(),
            service.getPrice(),
            service.getDuration(),
            normalizePublicPhotoUrl(service.getImageUrl()),
            null,
            service.getActive()
        );
    }

    private ProfessionalBookingResponse mapProfessionalBooking(Booking booking) {
        int postBufferMinutes = resolvePostBufferMinutes(booking.getService());
        return new ProfessionalBookingResponse(
            booking.getId(),
            String.valueOf(booking.getUser().getId()),
            booking.getUser().getFullName(),
            booking.getService().getId(),
            booking.getService().getName(),
            booking.getStartDateTime().toString(),
            booking.getService().getDuration(),
            postBufferMinutes,
            parseDurationToMinutes(booking.getService().getDuration()) + postBufferMinutes,
            booking.getStatus().name()
        );
    }

    private ProfesionalPublicSummaryResponse mapToSummary(ProfessionalProfile profile) {
        User user = profile.getUser();
        return new ProfesionalPublicSummaryResponse(
            String.valueOf(profile.getId()),
            profile.getSlug(),
            user.getFullName(),
            resolvePrimaryRubro(profile),
            profile.getLocation(),
            profile.getPublicHeadline(),
            mapCategories(profile.getCategories())
        );
    }

    private String resolvePrimaryRubro(ProfessionalProfile profile) {
        Set<Category> categories = profile.getCategories();
        if (categories == null || categories.isEmpty()) {
            return profile.getRubro();
        }
        return categories.stream()
            .sorted(categoryComparator())
            .map(Category::getName)
            .findFirst()
            .orElse(profile.getRubro());
    }

    private List<CategoryResponse> mapCategories(Set<Category> categories) {
        if (categories == null || categories.isEmpty()) {
            return List.of();
        }
        return categories.stream()
            .sorted(categoryComparator())
            .map(category -> new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getSlug(),
                category.getImageUrl(),
                category.getDisplayOrder()
            ))
            .toList();
    }

    private boolean matchesCategoryFilter(
        ProfessionalProfile profile,
        UUID categoryId,
        String categorySlug
    ) {
        if (categoryId == null && (categorySlug == null || categorySlug.isBlank())) {
            return true;
        }
        Set<Category> categories = profile.getCategories();
        if (categories == null || categories.isEmpty()) {
            return false;
        }
        if (categoryId != null && categories.stream().noneMatch(category -> categoryId.equals(category.getId()))) {
            return false;
        }
        if (categorySlug != null && !categorySlug.isBlank()) {
            return categories.stream().anyMatch(category -> categorySlug.equalsIgnoreCase(category.getSlug()));
        }
        return true;
    }

    private Set<Category> resolveCategoriesBySlugs(List<String> rawSlugs) {
        if (rawSlugs == null || rawSlugs.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seleccioná al menos un rubro");
        }
        Set<String> slugs = rawSlugs.stream()
            .map(slug -> slug == null ? "" : slug.trim().toLowerCase(Locale.ROOT))
            .map(this::mapLegacyCategorySlug)
            .filter(slug -> !slug.isBlank())
            .collect(Collectors.toCollection(LinkedHashSet::new));
        if (slugs.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seleccioná al menos un rubro");
        }
        List<Category> categories = categoryRepository.findBySlugIn(slugs);
        Set<String> found = categories.stream().map(Category::getSlug).collect(Collectors.toSet());
        Set<String> missing = slugs.stream()
            .filter(slug -> !found.contains(slug))
            .collect(Collectors.toCollection(LinkedHashSet::new));
        if (!missing.isEmpty()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Rubros inválidos: " + String.join(", ", missing)
            );
        }
        return new LinkedHashSet<>(categories);
    }

    private void applyCategories(ProfessionalProfile profile, Set<Category> categories) {
        if (categories == null || categories.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Seleccioná al menos un rubro");
        }
        profile.setCategories(new LinkedHashSet<>(categories));
        String primary = categories.stream()
            .sorted(categoryComparator())
            .map(Category::getName)
            .findFirst()
            .orElse(profile.getRubro());
        profile.setRubro(primary);
    }

    private String mapLegacyCategorySlug(String slug) {
        return LEGACY_CATEGORY_ALIASES.getOrDefault(slug, slug);
    }

    private Comparator<Category> categoryComparator() {
        return Comparator.comparingInt(
            (Category category) -> category.getDisplayOrder() == null ? Integer.MAX_VALUE : category.getDisplayOrder()
        ).thenComparing(Category::getName);
    }

    private boolean isProfessionalActive(ProfessionalProfile profile) {
        return !Boolean.FALSE.equals(profile.getActive());
    }

    private boolean isServiceActive(ProfesionalService service) {
        return !Boolean.FALSE.equals(service.getActive());
    }

    private void ensurePublicProfessionalIsActive(ProfessionalProfile profile) {
        if (isProfessionalActive(profile)) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrado");
    }

    private void ensureProfessionalReservable(ProfessionalProfile profile) {
        if (isProfessionalActive(profile)) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.CONFLICT, "El profesional está inactivo.");
    }

    private void ensureServiceReservable(ProfesionalService service) {
        if (isServiceActive(service)) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.CONFLICT, "El servicio está inactivo.");
    }

    private void ensureSlug(ProfessionalProfile profile) {
        if (profile.getSlug() != null && !profile.getSlug().isBlank()) {
            return;
        }
        String fullName = profile.getUser() == null ? "profesional" : profile.getUser().getFullName();
        String slug = SlugUtils.generateUniqueSlug(fullName, professionalProfileRepository::existsBySlug);
        profile.setSlug(slug);
    }

    private boolean isDatePaused(LocalDate date, List<ProfesionalSchedulePauseDto> pauses) {
        if (pauses == null || pauses.isEmpty()) {
            return false;
        }

        for (ProfesionalSchedulePauseDto pause : pauses) {
            if (pause == null || pause.getStartDate() == null || pause.getStartDate().isBlank()) {
                continue;
            }
            try {
                LocalDate startDate = LocalDate.parse(pause.getStartDate().trim());
                LocalDate endDate = pause.getEndDate() == null || pause.getEndDate().isBlank()
                    ? startDate
                    : LocalDate.parse(pause.getEndDate().trim());
                if (!date.isBefore(startDate) && !date.isAfter(endDate)) {
                    return true;
                }
            } catch (DateTimeParseException exception) {
                // Si hay una pausa inválida en DB, se ignora para no romper el endpoint público.
            }
        }

        return false;
    }

    private String dayKeyFromDate(LocalDate date) {
        DayOfWeek dayOfWeek = date.getDayOfWeek();
        return switch (dayOfWeek) {
            case MONDAY -> "mon";
            case TUESDAY -> "tue";
            case WEDNESDAY -> "wed";
            case THURSDAY -> "thu";
            case FRIDAY -> "fri";
            case SATURDAY -> "sat";
            case SUNDAY -> "sun";
        };
    }

    private LocalDateTime parseClientDateTimeToSystemZone(String rawDateTime) {
        if (rawDateTime == null || rawDateTime.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "startDateTime inválido");
        }

        String value = rawDateTime.trim();
        try {
            return LocalDateTime.parse(value);
        } catch (DateTimeParseException ignored) {
            // Intenta parsear ISO con offset/zona y convertir a la zona del sistema.
        }

        try {
            return OffsetDateTime.parse(value)
                .atZoneSameInstant(systemZoneId)
                .toLocalDateTime();
        } catch (DateTimeParseException ignored) {
            // Intenta parsear formato ZonedDateTime.
        }

        try {
            return ZonedDateTime.parse(value)
                .withZoneSameInstant(systemZoneId)
                .toLocalDateTime();
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "startDateTime inválido");
        }
    }

    private LocalDateTime nowInSystemZone() {
        return ZonedDateTime.now(systemZoneId).toLocalDateTime();
    }

    private LocalTime parseTime(String rawTime) {
        if (rawTime == null || rawTime.isBlank()) {
            return LocalTime.MAX;
        }
        try {
            return LocalTime.parse(rawTime.trim());
        } catch (DateTimeParseException exception) {
            return LocalTime.MAX;
        }
    }

    private int parseDurationToMinutes(String duration) {
        if (duration == null || duration.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Duración del servicio inválida");
        }

        String normalized = duration.trim().toLowerCase();
        if (normalized.matches("^\\d+$")) {
            int minutes = Integer.parseInt(normalized);
            if (minutes <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Duración del servicio inválida");
            }
            return minutes;
        }

        Matcher matcher = Pattern.compile("\\d+").matcher(normalized);
        List<Integer> numbers = new ArrayList<>();
        while (matcher.find()) {
            numbers.add(Integer.parseInt(matcher.group()));
        }
        if (numbers.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Duración del servicio inválida");
        }

        int minutes;
        if (normalized.contains("h")) {
            int hours = numbers.get(0);
            int extraMinutes = numbers.size() > 1 ? numbers.get(1) : 0;
            minutes = (hours * 60) + extraMinutes;
        } else {
            minutes = numbers.get(0);
        }

        if (minutes <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Duración del servicio inválida");
        }
        return minutes;
    }

    private Long resolveOrCreateManualClient(ProfessionalBookingCreateRequest request) {
        String clientName = request.getClientName() == null ? "" : request.getClientName().trim();
        if (clientName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre del cliente es obligatorio");
        }

        String clientEmail = normalizeOptional(request.getClientEmail());
        if (clientEmail != null) {
            clientEmail = clientEmail.toLowerCase(Locale.ROOT);
        }
        String clientPhone = normalizeOptional(request.getClientPhone());

        if (clientEmail != null) {
            User existing = userRepository.findByEmail(clientEmail).orElse(null);
            if (existing != null) {
                if (existing.getRole() != UserRole.USER) {
                    throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "El email pertenece a una cuenta no cliente"
                    );
                }
                boolean changed = false;
                if (!clientName.equals(existing.getFullName())) {
                    existing.setFullName(clientName);
                    changed = true;
                }
                if (clientPhone != null && !clientPhone.equals(existing.getPhoneNumber())) {
                    existing.setPhoneNumber(clientPhone);
                    changed = true;
                }
                if (changed) {
                    userRepository.save(existing);
                }
                return existing.getId();
            }
        }

        User newUser = new User();
        newUser.setFullName(clientName);
        newUser.setPhoneNumber(clientPhone);
        newUser.setRole(UserRole.USER);
        newUser.setEmail(clientEmail != null ? clientEmail : generateManualClientEmail());
        newUser.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));

        return userRepository.save(newUser).getId();
    }

    private String normalizeOptional(String value) {
        if (value == null) return null;
        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }

    private String generateManualClientEmail() {
        return "manual+" + UUID.randomUUID().toString().replace("-", "") + "@plura.local";
    }

    private void validateSlotDuration(Integer value) {
        if (value == null || !ALLOWED_SLOT_DURATIONS.contains(value)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "La duración de turnos debe ser uno de: 10, 15, 20, 25, 30, 35, 40, 45, 50, 55 o 60"
            );
        }
    }

    private int normalizeSlotDurationOrDefault(Integer value) {
        if (value == null || !ALLOWED_SLOT_DURATIONS.contains(value)) {
            return DEFAULT_SLOT_DURATION_MINUTES;
        }
        return value;
    }

    private int resolveSlotDurationMinutes(Integer value) {
        return normalizeSlotDurationOrDefault(value);
    }

    private int sanitizeSlotDurationMinutes(Integer requested, Integer current) {
        if (requested == null) {
            return resolveSlotDurationMinutes(current);
        }
        validateSlotDuration(requested);
        return requested;
    }

    private int sanitizePostBufferMinutes(Integer value) {
        int normalized = value == null ? 0 : value;
        if (normalized < 0) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "El tiempo extra debe ser mayor o igual a 0"
            );
        }
        return normalized;
    }

    private int resolvePostBufferMinutes(ProfesionalService service) {
        if (service == null) {
            return 0;
        }
        Integer raw = service.getPostBufferMinutes();
        if (raw == null || raw < 0) {
            return 0;
        }
        return raw;
    }

    private int resolveEffectiveDurationMinutes(ProfesionalService service) {
        int baseDuration = parseDurationToMinutes(service.getDuration());
        int postBuffer = resolvePostBufferMinutes(service);
        return baseDuration + postBuffer;
    }

    private boolean hasOverlap(
        List<BookedWindow> bookedWindows,
        LocalDateTime candidateStart,
        LocalDateTime candidateEnd
    ) {
        for (BookedWindow window : bookedWindows) {
            if (window == null) {
                continue;
            }
            boolean overlaps = candidateStart.isBefore(window.end()) && candidateEnd.isAfter(window.start());
            if (overlaps) {
                return true;
            }
        }
        return false;
    }

    private void validateBookingStatusTransition(BookingStatus current, BookingStatus next) {
        if (current == null || next == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Estado de reserva inválido");
        }
        if (current == next) {
            return;
        }

        boolean allowed = switch (current) {
            case PENDING -> next == BookingStatus.CONFIRMED || next == BookingStatus.CANCELLED;
            case CONFIRMED -> next == BookingStatus.COMPLETED || next == BookingStatus.CANCELLED;
            case CANCELLED, COMPLETED -> false;
        };

        if (!allowed) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Transición de estado inválida"
            );
        }
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/professional/ProfesionalPublicPageService.java
```java
package com.plura.plurabackend.professional;

import com.plura.plurabackend.booking.dto.ProfessionalBookingResponse;
import com.plura.plurabackend.booking.dto.ProfessionalBookingCreateRequest;
import com.plura.plurabackend.booking.dto.ProfessionalBookingUpdateRequest;
import com.plura.plurabackend.booking.dto.PublicBookingRequest;
import com.plura.plurabackend.booking.dto.PublicBookingResponse;
import com.plura.plurabackend.professional.dto.ProfesionalBusinessProfileUpdateRequest;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageResponse;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageUpdateRequest;
import com.plura.plurabackend.professional.dto.ProfesionalPublicSummaryResponse;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import com.plura.plurabackend.professional.service.dto.ProfesionalServiceRequest;
import com.plura.plurabackend.professional.service.dto.ProfesionalServiceResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class ProfesionalPublicPageService {

    private final BookingService bookingService;
    private final ScheduleService scheduleService;
    private final ProfessionalProfileService professionalProfileService;

    public ProfesionalPublicPageService(
        BookingService bookingService,
        ScheduleService scheduleService,
        ProfessionalProfileService professionalProfileService
    ) {
        this.bookingService = bookingService;
        this.scheduleService = scheduleService;
        this.professionalProfileService = professionalProfileService;
    }

    public ProfesionalPublicPageResponse getPublicPageBySlug(String slug) {
        return professionalProfileService.getPublicPageBySlug(slug);
    }

    public List<String> getAvailableSlots(String slug, String rawDate, String serviceId) {
        return scheduleService.getAvailableSlots(slug, rawDate, serviceId);
    }

    public PublicBookingResponse createPublicBooking(String slug, PublicBookingRequest request, String rawUserId) {
        return bookingService.createPublicBooking(slug, request, rawUserId);
    }

    public List<ProfessionalBookingResponse> getProfessionalBookings(
        String rawUserId,
        String rawDate,
        String rawDateFrom,
        String rawDateTo
    ) {
        return bookingService.getProfessionalBookings(rawUserId, rawDate, rawDateFrom, rawDateTo);
    }

    public ProfessionalBookingResponse createProfessionalBooking(
        String rawUserId,
        ProfessionalBookingCreateRequest request
    ) {
        return bookingService.createProfessionalBooking(rawUserId, request);
    }

    public ProfessionalBookingResponse updateProfessionalBooking(
        String rawUserId,
        Long bookingId,
        ProfessionalBookingUpdateRequest request
    ) {
        return bookingService.updateProfessionalBooking(rawUserId, bookingId, request);
    }

    public List<ProfesionalPublicSummaryResponse> listPublicProfessionals(
        Integer limit,
        UUID categoryId,
        String categorySlug
    ) {
        return professionalProfileService.listPublicProfessionals(limit, categoryId, categorySlug);
    }

    public ProfesionalPublicPageResponse getPublicPageByProfesionalId(String rawUserId) {
        return professionalProfileService.getPublicPageByProfesionalId(rawUserId);
    }

    public ProfesionalPublicPageResponse updatePublicPage(
        String rawUserId,
        ProfesionalPublicPageUpdateRequest request
    ) {
        return professionalProfileService.updatePublicPage(rawUserId, request);
    }

    public void updateBusinessProfile(String rawUserId, ProfesionalBusinessProfileUpdateRequest request) {
        professionalProfileService.updateBusinessProfile(rawUserId, request);
    }

    public ProfesionalScheduleDto getSchedule(String rawUserId) {
        return scheduleService.getSchedule(rawUserId);
    }

    public ProfesionalScheduleDto updateSchedule(String rawUserId, ProfesionalScheduleDto request) {
        return scheduleService.updateSchedule(rawUserId, request);
    }

    public List<ProfesionalServiceResponse> listServices(String rawUserId) {
        return professionalProfileService.listServices(rawUserId);
    }

    public ProfesionalServiceResponse createService(String rawUserId, ProfesionalServiceRequest request) {
        return professionalProfileService.createService(rawUserId, request);
    }

    public ProfesionalServiceResponse updateService(
        String rawUserId,
        String serviceId,
        ProfesionalServiceRequest request
    ) {
        return professionalProfileService.updateService(rawUserId, serviceId, request);
    }

    public void deleteService(String rawUserId, String serviceId) {
        professionalProfileService.deleteService(rawUserId, serviceId);
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/professional/ProfessionalProfileService.java
```java
package com.plura.plurabackend.professional;

import com.plura.plurabackend.professional.dto.ProfesionalBusinessProfileUpdateRequest;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageResponse;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageUpdateRequest;
import com.plura.plurabackend.professional.dto.ProfesionalPublicSummaryResponse;
import com.plura.plurabackend.professional.service.dto.ProfesionalServiceRequest;
import com.plura.plurabackend.professional.service.dto.ProfesionalServiceResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class ProfessionalProfileService {

    private final ProfesionalPublicPageCoreService coreService;

    public ProfessionalProfileService(ProfesionalPublicPageCoreService coreService) {
        this.coreService = coreService;
    }

    public ProfesionalPublicPageResponse getPublicPageBySlug(String slug) {
        return coreService.getPublicPageBySlug(slug);
    }

    public List<ProfesionalPublicSummaryResponse> listPublicProfessionals(
        Integer limit,
        UUID categoryId,
        String categorySlug
    ) {
        return coreService.listPublicProfessionals(limit, categoryId, categorySlug);
    }

    public ProfesionalPublicPageResponse getPublicPageByProfesionalId(String rawUserId) {
        return coreService.getPublicPageByProfesionalId(rawUserId);
    }

    public ProfesionalPublicPageResponse updatePublicPage(String rawUserId, ProfesionalPublicPageUpdateRequest request) {
        return coreService.updatePublicPage(rawUserId, request);
    }

    public void updateBusinessProfile(String rawUserId, ProfesionalBusinessProfileUpdateRequest request) {
        coreService.updateBusinessProfile(rawUserId, request);
    }

    public List<ProfesionalServiceResponse> listServices(String rawUserId) {
        return coreService.listServices(rawUserId);
    }

    public ProfesionalServiceResponse createService(String rawUserId, ProfesionalServiceRequest request) {
        return coreService.createService(rawUserId, request);
    }

    public ProfesionalServiceResponse updateService(String rawUserId, String serviceId, ProfesionalServiceRequest request) {
        return coreService.updateService(rawUserId, serviceId, request);
    }

    public void deleteService(String rawUserId, String serviceId) {
        coreService.deleteService(rawUserId, serviceId);
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/professional/ScheduleService.java
```java
package com.plura.plurabackend.professional;

import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ScheduleService {

    private final ProfesionalPublicPageCoreService coreService;

    public ScheduleService(ProfesionalPublicPageCoreService coreService) {
        this.coreService = coreService;
    }

    public List<String> getAvailableSlots(String slug, String rawDate, String serviceId) {
        return coreService.getAvailableSlots(slug, rawDate, serviceId);
    }

    public ProfesionalScheduleDto getSchedule(String rawUserId) {
        return coreService.getSchedule(rawUserId);
    }

    public ProfesionalScheduleDto updateSchedule(String rawUserId, ProfesionalScheduleDto request) {
        return coreService.updateSchedule(rawUserId, request);
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/professional/dto/ProfesionalBusinessProfileUpdateRequest.java
```java
package com.plura.plurabackend.professional.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Data;

@Data
public class ProfesionalBusinessProfileUpdateRequest {
    @Size(min = 2, max = 120)
    private String fullName;

    @Size(max = 120)
    private String rubro;

    @Size(max = 10)
    private List<@Size(max = 120) String> categorySlugs;

    @Size(max = 255)
    private String location;

    private Double latitude;
    private Double longitude;

    @Size(max = 30)
    @Pattern(regexp = "^[+0-9()\\-\\s]{3,30}$")
    private String phoneNumber;

    @Pattern(regexp = "^(https?://.+|r2://.+|r2:.+)$")
    private String logoUrl;
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/professional/dto/ProfesionalPublicPageResponse.java
```java
package com.plura.plurabackend.professional.dto;

import com.plura.plurabackend.category.dto.CategoryResponse;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import com.plura.plurabackend.professional.service.dto.ProfesionalServiceResponse;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ProfesionalPublicPageResponse {
    private String id;
    private String slug;
    private String fullName;
    private String rubro;
    private String headline;
    private String about;
    private String logoUrl;
    private String location;
    private Double latitude;
    private Double longitude;
    private List<CategoryResponse> categories;
    private List<String> photos;
    private ProfesionalScheduleDto schedule;
    private List<ProfesionalServiceResponse> services;
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/professional/dto/ProfesionalPublicPageUpdateRequest.java
```java
package com.plura.plurabackend.professional.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Data;

@Data
public class ProfesionalPublicPageUpdateRequest {
    @Size(max = 160)
    private String headline;

    @Size(max = 3000)
    private String about;

    @Size(max = 10)
    private List<@Pattern(regexp = "^(https?://.+|r2://.+|r2:.+)$") String> photos;
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/professional/dto/ProfesionalPublicSummaryResponse.java
```java
package com.plura.plurabackend.professional.dto;

import com.plura.plurabackend.category.dto.CategoryResponse;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ProfesionalPublicSummaryResponse {
    private String id;
    private String slug;
    private String fullName;
    private String rubro;
    private String location;
    private String headline;
    private List<CategoryResponse> categories;
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/professional/model/ProfessionalProfile.java
```java
package com.plura.plurabackend.professional.model;

import com.plura.plurabackend.category.model.Category;
import com.plura.plurabackend.user.model.User;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "professional_profile")
public class ProfessionalProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false)
    private String rubro;

    @Column(name = "display_name")
    private String displayName;

    @Column(unique = true)
    private String slug;

    @Column(name = "public_headline")
    private String publicHeadline;

    @Column(name = "public_about", columnDefinition = "text")
    private String publicAbout;

    @Column(name = "logo_url")
    private String logoUrl;

    @ElementCollection
    @CollectionTable(
        name = "professional_profile_photos",
        joinColumns = @JoinColumn(name = "professional_id")
    )
    @Column(name = "url")
    @OrderColumn(name = "position")
    private List<String> publicPhotos = new ArrayList<>();

    @Column
    private String location;

    @Column(name = "location_text")
    private String locationText;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "rating", nullable = false)
    private Double rating = 0d;

    @Column(name = "reviews_count", nullable = false)
    private Integer reviewsCount = 0;

    @Column(name = "tipo_cliente")
    private String tipoCliente;

    @Column(name = "schedule_json", columnDefinition = "text")
    private String scheduleJson;

    @Column(name = "slot_duration_minutes", nullable = false)
    private Integer slotDurationMinutes = 15;

    @Column(name = "has_availability_today", nullable = false)
    private Boolean hasAvailabilityToday = false;

    @Column(name = "next_available_at")
    private LocalDateTime nextAvailableAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "professional_categories",
        joinColumns = @JoinColumn(name = "professional_id"),
        inverseJoinColumns = @JoinColumn(name = "category_id")
    )
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Set<Category> categories = new HashSet<>();

    @Column(name = "active", nullable = false)
    private Boolean active = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (this.active == null) {
            this.active = true;
        }
        if (this.rating == null) {
            this.rating = 0d;
        }
        if (this.reviewsCount == null) {
            this.reviewsCount = 0;
        }
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.slotDurationMinutes == null) {
            this.slotDurationMinutes = 15;
        }
        if (this.hasAvailabilityToday == null) {
            this.hasAvailabilityToday = false;
        }
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/professional/photo/model/BusinessPhoto.java
```java
package com.plura.plurabackend.professional.photo.model;

import com.plura.plurabackend.professional.model.ProfessionalProfile;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "business_photo")
public class BusinessPhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "professional_id", nullable = false)
    private ProfessionalProfile professional;

    @Column(nullable = false, length = 500)
    private String url;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BusinessPhotoType type = BusinessPhotoType.LOCAL;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (this.type == null) {
            this.type = BusinessPhotoType.LOCAL;
        }
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/professional/photo/model/BusinessPhotoType.java
```java
package com.plura.plurabackend.professional.photo.model;

public enum BusinessPhotoType {
    LOCAL,
    SERVICE,
    WORK
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/professional/photo/repository/BusinessPhotoRepository.java
```java
package com.plura.plurabackend.professional.photo.repository;

import com.plura.plurabackend.professional.photo.model.BusinessPhoto;
import com.plura.plurabackend.professional.photo.model.BusinessPhotoType;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BusinessPhotoRepository extends JpaRepository<BusinessPhoto, Long> {
    List<BusinessPhoto> findByProfessional_IdAndTypeInOrderByCreatedAtAsc(
        Long professionalId,
        Collection<BusinessPhotoType> types
    );

    void deleteByProfessional_IdAndType(Long professionalId, BusinessPhotoType type);
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/professional/repository/ProfessionalProfileRepository.java
```java
package com.plura.plurabackend.professional.repository;

import com.plura.plurabackend.professional.model.ProfessionalProfile;
import jakarta.persistence.LockModeType;
import java.util.UUID;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;

public interface ProfessionalProfileRepository extends JpaRepository<ProfessionalProfile, Long> {
    Optional<ProfessionalProfile> findBySlug(String slug);

    boolean existsBySlug(String slug);

    Optional<ProfessionalProfile> findByUser_Id(Long userId);

    long countByActiveTrue();

    List<ProfessionalProfile> findByIdInAndActiveTrue(Collection<Long> ids);

    @Query(
        """
        SELECT DISTINCT p
        FROM ProfessionalProfile p
        LEFT JOIN FETCH p.user
        LEFT JOIN FETCH p.categories
        WHERE p.id IN :ids AND p.active = true
        """
    )
    List<ProfessionalProfile> findByIdInAndActiveTrueWithRelations(@Param("ids") Collection<Long> ids);

    List<ProfessionalProfile> findByActiveTrueOrderByCreatedAtDesc(Pageable pageable);

    @Query(
        """
        SELECT DISTINCT p
        FROM ProfessionalProfile p
        LEFT JOIN FETCH p.user
        LEFT JOIN FETCH p.categories
        WHERE p.active = true
        ORDER BY p.createdAt DESC
        """
    )
    List<ProfessionalProfile> findByActiveTrueWithRelationsOrderByCreatedAtDesc(Pageable pageable);

    @Query(
        """
        SELECT p.id
        FROM ProfessionalProfile p
        WHERE p.active = true
            AND (
                :categoryId IS NULL
                OR EXISTS (
                    SELECT 1
                    FROM p.categories categoryById
                    WHERE categoryById.id = :categoryId
                )
            )
            AND (
                :categorySlug IS NULL
                OR :categorySlug = ''
                OR EXISTS (
                    SELECT 1
                    FROM p.categories categoryBySlug
                    WHERE LOWER(categoryBySlug.slug) = LOWER(:categorySlug)
                )
            )
        ORDER BY p.createdAt DESC
        """
    )
    Page<Long> findActiveIdsForPublicListing(
        @Param("categoryId") UUID categoryId,
        @Param("categorySlug") String categorySlug,
        Pageable pageable
    );

    @Query(
        """
        SELECT DISTINCT p
        FROM ProfessionalProfile p
        LEFT JOIN FETCH p.user
        LEFT JOIN FETCH p.categories
        WHERE p.active = true
        """
    )
    List<ProfessionalProfile> findAllActiveWithRelations();

    /** Lock pesimista para serializar creaciones de reservas sobre el mismo profesional. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM ProfessionalProfile p WHERE p.slug = :slug")
    Optional<ProfessionalProfile> findBySlugForUpdate(@Param("slug") String slug);

    @Modifying
    @Query(
        value = """
            UPDATE professional_profile
            SET latitude = :lat,
                longitude = :lng,
                geom = CASE
                    WHEN :lat IS NULL OR :lng IS NULL THEN NULL
                    ELSE ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
                END
            WHERE id = :profileId
            """,
        nativeQuery = true
    )
    void updateCoordinates(
        @Param("profileId") Long profileId,
        @Param("lat") Double latitude,
        @Param("lng") Double longitude
    );

    @Modifying
    @Query(
        value = """
            UPDATE professional_profile
            SET has_availability_today = :hasAvailabilityToday
            WHERE id = :profileId
            """,
        nativeQuery = true
    )
    void updateHasAvailabilityToday(
        @Param("profileId") Long profileId,
        @Param("hasAvailabilityToday") boolean hasAvailabilityToday
    );

    @Modifying
    @Query(
        value = """
            UPDATE professional_profile
            SET has_availability_today = :hasAvailabilityToday,
                next_available_at = :nextAvailableAt
            WHERE id = :profileId
            """,
        nativeQuery = true
    )
    void updateAvailabilitySummary(
        @Param("profileId") Long profileId,
        @Param("hasAvailabilityToday") boolean hasAvailabilityToday,
        @Param("nextAvailableAt") LocalDateTime nextAvailableAt
    );

    @Query(
        """
        SELECT COUNT(p)
        FROM ProfessionalProfile p
        WHERE p.active = true AND p.nextAvailableAt IS NULL
        """
    )
    long countActiveWithNextAvailableAtNull();
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/professional/schedule/dto/ProfesionalScheduleDayDto.java
```java
package com.plura.plurabackend.professional.schedule.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProfesionalScheduleDayDto {
    @Pattern(regexp = "^(?i)(mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$")
    private String day;
    private boolean enabled;
    private boolean paused;

    @Valid
    private List<ProfesionalScheduleRangeDto> ranges;
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/professional/schedule/dto/ProfesionalScheduleDto.java
```java
package com.plura.plurabackend.professional.schedule.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProfesionalScheduleDto {
    @NotNull
    @Size(min = 1, max = 7)
    @Valid
    private List<ProfesionalScheduleDayDto> days;

    @Valid
    private List<ProfesionalSchedulePauseDto> pauses;

    @Positive
    private Integer slotDurationMinutes;
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/professional/schedule/dto/ProfesionalSchedulePauseDto.java
```java
package com.plura.plurabackend.professional.schedule.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProfesionalSchedulePauseDto {
    @Size(max = 80)
    private String id;

    @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$")
    private String startDate;

    @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$")
    private String endDate;

    @Size(max = 500)
    private String note;
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/professional/schedule/dto/ProfesionalScheduleRangeDto.java
```java
package com.plura.plurabackend.professional.schedule.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProfesionalScheduleRangeDto {
    @Size(max = 80)
    private String id;

    @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$")
    private String start;

    @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$")
    private String end;
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/professional/service/ServiceImageStorageService.java
```java
package com.plura.plurabackend.professional.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ServiceImageStorageService {

    private static final long MAX_FILE_SIZE_BYTES = 1024 * 1024;
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
        "image/jpeg",
        "image/png",
        "image/webp"
    );

    private final Path uploadRootPath;

    public ServiceImageStorageService(@Value("${app.storage.upload-dir:uploads}") String uploadDir) {
        this.uploadRootPath = Path.of(uploadDir).toAbsolutePath().normalize();
    }

    public String storeServiceImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La imagen es obligatoria");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La imagen supera 1MB");
        }

        String contentType = file.getContentType() == null
            ? ""
            : file.getContentType().trim().toLowerCase(Locale.ROOT);
        if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Formato inválido. Solo jpg, png o webp"
            );
        }

        String extension = resolveExtension(contentType);
        String fileName = "service-" + UUID.randomUUID() + extension;
        Path targetDirectory = uploadRootPath.resolve("services").normalize();
        Path targetFile = targetDirectory.resolve(fileName).normalize();
        if (!targetFile.startsWith(targetDirectory)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ruta de archivo inválida");
        }

        try {
            Files.createDirectories(targetDirectory);
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetFile, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException exception) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "No se pudo guardar la imagen"
            );
        }

        return "/uploads/services/" + fileName;
    }

    private String resolveExtension(String contentType) {
        return switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Formato inválido");
        };
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/professional/service/dto/ProfesionalServiceRequest.java
```java
package com.plura.plurabackend.professional.service.dto;

import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class ProfesionalServiceRequest {
    @Size(max = 120)
    private String name;

    @Size(max = 200)
    private String description;

    @Positive
    private BigDecimal price;

    @Size(max = 40)
    private String duration;

    @Size(max = 500)
    private String imageUrl;

    private Integer postBufferMinutes;
    private Boolean active;
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/professional/service/dto/ProfesionalServiceResponse.java
```java
package com.plura.plurabackend.professional.service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ProfesionalServiceResponse {
    private String id;
    private String name;
    private String description;
    private String price;
    private String duration;
    private String imageUrl;
    private Integer postBufferMinutes;
    private Boolean active;
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/professional/service/model/ProfesionalService.java
```java
package com.plura.plurabackend.professional.service.model;

import com.plura.plurabackend.professional.model.ProfessionalProfile;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "professional_service")
public class ProfesionalService {

    @Id
    @Column(nullable = false, length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "professional_id", nullable = false)
    private ProfessionalProfile professional;

    @Column(nullable = false)
    private String name;

    @Column(length = 200)
    private String description;

    @Column(nullable = false)
    private String price;

    @Column(nullable = false)
    private String duration;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "post_buffer_minutes")
    private Integer postBufferMinutes = 0;

    @Column(name = "active", nullable = false)
    private Boolean active = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (this.id == null || this.id.isBlank()) {
            this.id = java.util.UUID.randomUUID().toString();
        }
        if (this.active == null) {
            this.active = true;
        }
        if (this.postBufferMinutes == null || this.postBufferMinutes < 0) {
            this.postBufferMinutes = 0;
        }
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/professional/service/repository/ProfesionalServiceRepository.java
```java
package com.plura.plurabackend.professional.service.repository;

import com.plura.plurabackend.professional.service.model.ProfesionalService;
import java.util.List;
import java.util.Collection;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfesionalServiceRepository extends JpaRepository<ProfesionalService, String> {
    List<ProfesionalService> findByProfessional_IdOrderByCreatedAtDesc(Long professionalId);

    List<ProfesionalService> findByProfessional_IdAndActiveTrueOrderByCreatedAtDesc(Long professionalId);

    List<ProfesionalService> findByProfessional_IdInAndActiveTrueOrderByCreatedAtDesc(Collection<Long> professionalIds);
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/search/SearchController.java
```java
package com.plura.plurabackend.search;

import com.plura.plurabackend.search.dto.SearchResponse;
import com.plura.plurabackend.search.dto.SearchSuggestResponse;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping
    public SearchResponse search(
        @RequestParam(required = false) String type,
        @RequestParam(required = false) String query,
        @RequestParam(required = false) String categorySlug,
        @RequestParam(required = false) Double lat,
        @RequestParam(required = false) Double lng,
        @RequestParam(required = false) Double radiusKm,
        @RequestParam(required = false) String city,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
        @RequestParam(required = false, defaultValue = "false") boolean availableNow,
        @RequestParam(required = false) Integer page,
        @RequestParam(required = false) Integer size,
        @RequestParam(required = false) String sort
    ) {
        return searchService.search(
            query,
            type,
            categorySlug,
            lat,
            lng,
            radiusKm,
            city,
            date,
            from,
            to,
            availableNow,
            page,
            size,
            sort
        );
    }

    @GetMapping("/suggest")
    public SearchSuggestResponse suggest(
        @RequestParam(required = false) String q,
        @RequestParam(required = false) Double lat,
        @RequestParam(required = false) Double lng,
        @RequestParam(required = false) String city,
        @RequestParam(required = false) Double radiusKm,
        @RequestParam(required = false) Integer limit
    ) {
        return searchService.suggest(q, lat, lng, city, radiusKm, limit);
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/user/model/User.java
```java
package com.plura.plurabackend.user.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "app_user")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "phone_number")
    private String phoneNumber;

    @Column(nullable = false)
    @JsonIgnore
    private String password;

    @Column(length = 20)
    private String provider;

    @Column(name = "provider_id", length = 255)
    private String providerId;

    @Column(length = 500)
    private String avatar;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/user/model/UserRole.java
```java
package com.plura.plurabackend.user.model;

public enum UserRole {
    USER,
    PROFESSIONAL
}
```

### FILE: backend-java/src/main/java/com/plura/plurabackend/user/repository/UserRepository.java
```java
package com.plura.plurabackend.user.repository;

import com.plura.plurabackend.user.model.User;
import com.plura.plurabackend.user.model.UserRole;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    Optional<User> findByProviderAndProviderId(String provider, String providerId);

    long countByRole(UserRole role);
}
```

### FILE: backend-java/src/main/resources/application.yml
```yaml
server:
  port: ${PORT:3000}

spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL}
    username: ${SPRING_DATASOURCE_USERNAME}
    password: ${SPRING_DATASOURCE_PASSWORD}
    hikari:
      maximum-pool-size: ${HIKARI_MAX_POOL_SIZE:50}
      minimum-idle: ${HIKARI_MIN_IDLE:10}
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000
      connection-init-sql: ${HIKARI_CONNECTION_INIT_SQL:SET statement_timeout TO '5s'}
  jackson:
    time-zone: ${APP_TIMEZONE:America/Montevideo}
  jpa:
    hibernate:
      # Producción: validate. Desarrollo: setear SPRING_JPA_DDL_AUTO=update en .env
      ddl-auto: ${SPRING_JPA_DDL_AUTO:validate}
      naming:
        physical-strategy: org.hibernate.boot.model.naming.PhysicalNamingStrategyStandardImpl
    show-sql: ${SPRING_JPA_SHOW_SQL:false}
    properties:
      hibernate:
        globally_quoted_identifiers: true
        globally_quoted_identifiers_skip_column_definitions: true
        jdbc:
          time_zone: ${APP_TIMEZONE:America/Montevideo}

jwt:
  secret: ${JWT_SECRET}
  issuer: ${JWT_ISSUER:plura}
  expiration-minutes: ${JWT_EXPIRATION_MINUTES:30}
  refresh-days: ${JWT_REFRESH_DAYS:30}
  # Sin default: la app falla en startup si no está configurado.
  refresh-pepper: ${JWT_REFRESH_PEPPER}

oauth:
  google:
    client-id: ${GOOGLE_CLIENT_ID:}
  apple:
    client-id: ${APPLE_CLIENT_ID:}

cache:
  enabled: ${CACHE_ENABLED:false}

redis:
  enabled: ${REDIS_ENABLED:false}
  host: ${REDIS_HOST:localhost}
  port: ${REDIS_PORT:6379}
  password: ${REDIS_PASSWORD:}
  ttl-seconds: ${REDIS_TTL_SECONDS:300}

feature:
  cache:
    search-enabled: ${SEARCH_CACHE_ENABLED:false}
    suggest-enabled: ${SUGGEST_CACHE_ENABLED:false}
    profile-enabled: ${PROFILE_CACHE_ENABLED:false}
    slots-enabled: ${SLOTS_CACHE_ENABLED:false}
  search:
    no-count-mode-enabled: ${SEARCH_NO_COUNT_MODE:false}
    has-availability-today-enabled: ${HAS_AVAILABILITY_TODAY_ENABLED:false}
    availability-source: ${SEARCH_AVAILABILITY_SOURCE:AVAILABLE_SLOT}
  availability:
    slot-rebuild-enabled: ${AVAILABLE_SLOT_REBUILD_ENABLED:true}
    summary-enabled: ${SCHEDULE_SUMMARY_ENABLED:false}
    next-available-at-enabled: ${NEXT_AVAILABLE_AT_ENABLED:false}

app:
  # Zona horaria única del sistema (MVP). Slots y reservas se calculan en esta zona.
  timezone: ${APP_TIMEZONE:America/Montevideo}
  mapbox:
    token: ${MAPBOX_TOKEN:${NEXT_PUBLIC_MAPBOX_TOKEN:}}
  search:
    # Recalcula la agenda de slots disponibles diariamente.
    slot-rebuild-cron: ${APP_SEARCH_SLOT_REBUILD_CRON:0 0 2 * * *}
    # Días a recalcular en la corrida nocturna.
    slot-rebuild-days: ${APP_SEARCH_SLOT_REBUILD_DAYS:30}
    # Encola rebuild inicial al levantar la app sin bloquear readiness.
    slot-bootstrap-enabled: ${APP_SEARCH_SLOT_BOOTSTRAP_ENABLED:true}
    slot-bootstrap-days: ${APP_SEARCH_SLOT_BOOTSTRAP_DAYS:7}
  cors:
    allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:3002}
  auth:
    # Producción: true. Desarrollo local (HTTP): setear AUTH_COOKIE_SECURE=false en .env
    cookie-secure: ${AUTH_COOKIE_SECURE:true}
    cookie-same-site: ${AUTH_COOKIE_SAMESITE:Strict}
  storage:
    upload-dir: ${APP_UPLOAD_DIR:uploads}
    provider: ${IMAGE_STORAGE_PROVIDER:${STORAGE_PROVIDER:local}}
    public-base-url: ${STORAGE_PUBLIC_BASE_URL:/uploads}
    local-base-dir: ${STORAGE_LOCAL_BASE_DIR:./uploads}
    upload-url-expiration-minutes: ${IMAGE_UPLOAD_URL_EXPIRATION_MINUTES:10}
    max-upload-bytes: ${IMAGE_MAX_UPLOAD_BYTES:5242880}
    allowed-content-types: ${IMAGE_ALLOWED_CONTENT_TYPES:image/jpeg,image/png,image/webp,image/avif}
    r2:
      endpoint: ${R2_ENDPOINT:}
      bucket: ${R2_BUCKET:plura-images}
      region: ${R2_REGION:auto}
      access-key-id: ${R2_ACCESS_KEY_ID:}
      secret-access-key: ${R2_SECRET_ACCESS_KEY:}
      public-base-url: ${R2_PUBLIC_BASE_URL:}

  sqs:
    enabled: ${SQS_ENABLED:false}
    endpoint: ${SQS_ENDPOINT:}
    region: ${SQS_REGION:us-east-1}
    access-key-id: ${SQS_ACCESS_KEY_ID:}
    secret-access-key: ${SQS_SECRET_ACCESS_KEY:}
    queue-url: ${SQS_QUEUE_URL:}
    dlq-url: ${SQS_DLQ_URL:}
    wait-time-seconds: ${SQS_WAIT_TIME_SECONDS:10}
    max-messages: ${SQS_MAX_MESSAGES:10}

  search-engine:
    enabled: ${SEARCH_ENGINE_ENABLED:false}
    suggest-enabled: ${SEARCH_ENGINE_SUGGEST_ENABLED:false}
    hydrate-from-db: ${SEARCH_ENGINE_HYDRATE_FROM_DB:true}
    provider: ${SEARCH_ENGINE_PROVIDER:MEILI}
    meili:
      host: ${MEILI_HOST:http://localhost:7700}
      api-key: ${MEILI_API_KEY:}
      index-name: ${MEILI_INDEX_NAME:professional_profile}
      timeout-millis: ${MEILI_TIMEOUT_MILLIS:2000}
      reindex-on-startup: ${MEILI_REINDEX_ON_STARTUP:false}

  availability:
    summary-lookahead-days: ${SCHEDULE_SUMMARY_LOOKAHEAD_DAYS:14}
    summary-cron: ${SCHEDULE_SUMMARY_CRON:0 */30 * * * *}

jobs:
  sqs:
    thumbnail-enabled: ${THUMBNAIL_SQS_ENABLED:false}
    schedule-summary-enabled: ${SCHEDULE_SUMMARY_SQS_ENABLED:false}
    search-index-enabled: ${SEARCH_INDEX_SQS_ENABLED:false}

springdoc:
  swagger-ui:
    path: /swagger-ui.html
    # Deshabilitado por defecto. Desarrollo: setear SWAGGER_ENABLED=true en .env
    enabled: ${SWAGGER_ENABLED:false}
  api-docs:
    enabled: ${SWAGGER_ENABLED:false}

logging:
  level:
    root: ${LOG_LEVEL_ROOT:INFO}
```

### FILE: backend-java/src/test/java/com/plura/plurabackend/PluraBackendApplicationTests.java
```java
package com.plura.plurabackend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
	"SPRING_DATASOURCE_URL=jdbc:h2:mem:plura-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
	"SPRING_DATASOURCE_USERNAME=sa",
	"SPRING_DATASOURCE_PASSWORD=",
	"SPRING_JPA_DDL_AUTO=create-drop",
	"JWT_SECRET=test-secret-for-context-load",
	"JWT_REFRESH_PEPPER=test-refresh-pepper",
	"APP_TIMEZONE=America/Montevideo",
	"CACHE_ENABLED=false",
	"HIKARI_CONNECTION_INIT_SQL=SELECT 1",
	"SWAGGER_ENABLED=false",
})
class PluraBackendApplicationTests {

	@Test
	void contextLoads() {
	}

}
```

### FILE: backend-java/src/test/java/com/plura/plurabackend/search/SearchServiceTest.java
```java
package com.plura.plurabackend.search;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.cache.SearchCacheService;
import com.plura.plurabackend.search.dto.SearchItemResponse;
import com.plura.plurabackend.search.dto.SearchResponse;
import com.plura.plurabackend.search.engine.SearchEngineClient;
import com.plura.plurabackend.storage.ImageStorageService;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class SearchServiceTest {

    @Test
    void shouldFallbackToSqlWhenSearchEngineFails() {
        SearchNativeRepository repository = Mockito.mock(SearchNativeRepository.class);
        SearchCacheService cacheService = Mockito.mock(SearchCacheService.class);
        SearchEngineClient engineClient = Mockito.mock(SearchEngineClient.class);
        ImageStorageService imageStorageService = Mockito.mock(ImageStorageService.class);

        when(cacheService.getSearch(anyString())).thenReturn(Optional.empty());
        when(imageStorageService.resolvePublicUrl(anyString())).thenReturn("https://cdn.example/profiles/photo.jpg");
        when(repository.search(any(), anyBoolean(), anyString(), anyBoolean()))
            .thenReturn(new SearchNativeRepository.SearchPageResult(
                1L,
                List.of(new SearchItemResponse(
                    "1",
                    "pro-uno",
                    "Pro Uno",
                    "Headline",
                    4.8,
                    10,
                    List.of("cabello"),
                    null,
                    -34.9,
                    -56.1,
                    1500d,
                    "r2://bucket/profiles/photo.jpg",
                    "Montevideo"
                )),
                false
            ));
        when(engineClient.search(any())).thenThrow(new IllegalStateException("Meili down"));

        SearchService service = new SearchService(
            repository,
            cacheService,
            new SimpleMeterRegistry(),
            Optional.of(engineClient),
            imageStorageService,
            false,
            "AVAILABLE_SLOT",
            false,
            true,
            false,
            true
        );

        SearchResponse response = service.search(
            "barber",
            "SERVICIO",
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            false,
            0,
            10,
            "RELEVANCE"
        );

        assertEquals(1L, response.getTotal());
        assertEquals(1, response.getItems().size());
        assertEquals("https://cdn.example/profiles/photo.jpg", response.getItems().get(0).getCoverImageUrl());
        verify(repository).search(any(), anyBoolean(), anyString(), anyBoolean());
    }
}
```

### FILE: backend-java/src/test/java/com/plura/plurabackend/storage/LocalImageStorageServiceTest.java
```java
package com.plura.plurabackend.storage;

import static org.junit.jupiter.api.Assertions.assertEquals;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;

class LocalImageStorageServiceTest {

    @Test
    void shouldResolveLegacyHttpAndR2References() {
        LocalImageStorageService storageService = new LocalImageStorageService(
            "/uploads",
            "./build/test-uploads",
            new SimpleMeterRegistry()
        );

        assertEquals(
            "https://legacy.example/image.jpg",
            storageService.generatePublicUrl("https://legacy.example/image.jpg")
        );
        assertEquals(
            "/uploads/profiles/photo.jpg",
            storageService.generatePublicUrl("r2://bucket/profiles/photo.jpg")
        );
        assertEquals(
            "/uploads/profiles/photo.jpg",
            storageService.generatePublicUrl("r2:profiles/photo.jpg")
        );
    }
}
```

