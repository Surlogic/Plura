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
import com.plura.plurabackend.category.model.Category;
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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executor;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
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
public class ProfessionalPublicPageCoreService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ProfessionalPublicPageCoreService.class);

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
    private final ProfessionalProfileRepository professionalProfileRepository;
    private final BusinessPhotoRepository businessPhotoRepository;
    private final ProfessionalCategorySupport categorySupport;
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
    private final Executor geocodingExecutor;
    private final Set<Long> geocodingInFlight = ConcurrentHashMap.newKeySet();
    private final String mapboxToken;

    public ProfessionalPublicPageCoreService(
        ProfessionalProfileRepository professionalProfileRepository,
        BusinessPhotoRepository businessPhotoRepository,
        ProfessionalCategorySupport categorySupport,
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
        ImageThumbnailJobService imageThumbnailJobService,
        @Qualifier("geocodingExecutor") Executor geocodingExecutor
    ) {
        this.professionalProfileRepository = professionalProfileRepository;
        this.businessPhotoRepository = businessPhotoRepository;
        this.categorySupport = categorySupport;
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
        this.geocodingExecutor = geocodingExecutor;
    }

    public ProfesionalPublicPageResponse getPublicPageBySlug(String slug) {
        var cached = profileCacheService.getPublicPageBySlug(slug);
        if (cached.isPresent()) {
            ProfesionalPublicPageResponse cachedResponse = cached.get();
            if (cachedResponse.getName() != null && !cachedResponse.getName().isBlank()) {
                return cachedResponse;
            }
            profileCacheService.evictPublicPageBySlug(slug);
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
        if (service.getProfessional() == null || !service.getProfessional().getId().equals(profile.getId())) {
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
            if (service.getProfessional() == null || !service.getProfessional().getId().equals(profile.getId())) {
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
        Integer page,
        Integer size,
        UUID categoryId,
        String categorySlug
    ) {
        String normalizedCategorySlug = categorySlug == null
            ? null
            : categorySlug.trim().toLowerCase(Locale.ROOT);
        String cacheKey = buildPublicSummaryCacheKey(limit, page, size, categoryId, normalizedCategorySlug);
        var cached = profileCacheService.getPublicSummaries(cacheKey);
        if (cached.isPresent()) {
            return cached.get();
        }

        int requestedPage = page == null ? 0 : Math.max(0, page);
        int requestedSize = size == null ? 60 : Math.max(1, Math.min(size, 200));
        int effectiveLimit = (limit != null && limit > 0)
            ? Math.min(limit, 200)
            : requestedSize;
        int pageSize = Math.min(requestedSize, effectiveLimit);
        int currentPage = requestedPage;
        List<ProfessionalProfile> profiles = new ArrayList<>();

        while (profiles.size() < effectiveLimit && page == null && size == null) {
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

        if (page != null || size != null) {
            Page<Long> idsPage = professionalProfileRepository.findActiveIdsForPublicListing(
                categoryId,
                normalizedCategorySlug,
                PageRequest.of(requestedPage, pageSize)
            );
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
            }
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
            Set<Category> categories = categorySupport.resolveCategoriesBySlugs(request.getCategorySlugs());
            categorySupport.applyCategories(profile, categories);
        } else if (request.getRubro() != null) {
            String rubro = request.getRubro().trim();
            if (rubro.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El rubro no puede estar vacío");
            }
            String mappedSlug = SlugUtils.toSlug(rubro);
            Category category = categorySupport.resolveCategoriesBySlugs(List.of(mappedSlug)).stream()
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rubro inválido"));
            categorySupport.applyCategories(profile, Set.of(category));
        }

        String nextCountry = profile.getCountry();
        String nextCity = profile.getCity();
        String nextFullAddress = profile.getFullAddress();
        Double nextLatitude = profile.getLatitude();
        Double nextLongitude = profile.getLongitude();

        if (request.getCountry() != null) {
            nextCountry = normalizeLocationPart(request.getCountry());
        }
        if (request.getCity() != null) {
            nextCity = normalizeLocationPart(request.getCity());
        }
        if (request.getFullAddress() != null) {
            nextFullAddress = normalizeLocationPart(request.getFullAddress());
        }

        if (request.getLocation() != null && !hasAnyStructuredLocationInput(request)) {
            // Backward compatibility for older clients still sending a single location string.
            String location = request.getLocation().trim();
            if (location.isBlank()) {
                nextCountry = null;
                nextCity = null;
                nextFullAddress = null;
            } else {
                nextFullAddress = location;
            }
        }

        if (nextCountry == null && nextCity == null && nextFullAddress == null) {
            profile.setCountry(null);
            profile.setCity(null);
            profile.setFullAddress(null);
            profile.setLocation(null);
            profile.setLocationText(null);
            profile.setLatitude(null);
            profile.setLongitude(null);
        } else {
            if (nextCountry == null || nextCity == null || nextFullAddress == null) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "country, city y fullAddress deben enviarse juntos"
                );
            }
            String composedLocation = composeLocation(nextFullAddress, nextCity, nextCountry);
            profile.setCountry(nextCountry);
            profile.setCity(nextCity);
            profile.setFullAddress(nextFullAddress);
            profile.setLocation(composedLocation);
            profile.setLocationText(composedLocation);
            if (request.getLatitude() != null || request.getLongitude() != null) {
                nextLatitude = requestedLatitude;
                nextLongitude = requestedLongitude;
            }
            profile.setLatitude(nextLatitude);
            profile.setLongitude(nextLongitude);
        }

        if (request.getLogoUrl() != null) {
            String logoUrl = request.getLogoUrl().trim();
            profile.setLogoUrl(logoUrl.isBlank() ? null : logoUrl);
            if (!logoUrl.isBlank()) {
                imageThumbnailJobService.generateThumbnailsAsync(extractStorageObjectKey(logoUrl));
            }
        }
        if (request.getInstagram() != null) {
            profile.setInstagram(normalizeOptional(request.getInstagram()));
        }
        if (request.getFacebook() != null) {
            profile.setFacebook(normalizeOptional(request.getFacebook()));
        }
        if (request.getTiktok() != null) {
            profile.setTiktok(normalizeOptional(request.getTiktok()));
        }
        if (request.getWebsite() != null) {
            profile.setWebsite(normalizeOptional(request.getWebsite()));
        }
        if (request.getWhatsapp() != null) {
            profile.setWhatsapp(normalizeOptional(request.getWhatsapp()));
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

        ProfessionalScheduleSupport.validateSchedule(request, this::validateSlotDuration);
        ProfesionalScheduleDto normalized = ProfessionalScheduleSupport.normalizeSchedule(
            request,
            DEFAULT_SLOT_DURATION_MINUTES,
            this::normalizeSlotDurationOrDefault
        );
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

        if (service.getProfessional() == null || !service.getProfessional().getId().equals(profile.getId())) {
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

        if (service.getProfessional() == null || !service.getProfessional().getId().equals(profile.getId())) {
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

    private String buildPublicSummaryCacheKey(
        Integer limit,
        Integer page,
        Integer size,
        UUID categoryId,
        String categorySlug
    ) {
        return "limit=" + (limit == null ? "" : limit)
            + "|page=" + (page == null ? "" : page)
            + "|size=" + (size == null ? "" : size)
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
        if (date.isBefore(now.toLocalDate()) || ProfessionalScheduleSupport.isDatePaused(date, schedule.getPauses())) {
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
        return ProfessionalScheduleSupport.readStoredSchedule(
            objectMapper,
            rawScheduleJson,
            DEFAULT_SLOT_DURATION_MINUTES,
            this::normalizeSlotDurationOrDefault
        );
    }

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
            user.getFullName(),
            categorySupport.resolvePrimaryRubro(profile),
            profile.getPublicAbout(),
            profile.getPublicHeadline(),
            profile.getPublicAbout(),
            normalizePublicPhotoUrl(profile.getLogoUrl()),
            profile.getFullAddress() == null ? profile.getLocation() : profile.getFullAddress(),
            profile.getLocation(),
            profile.getCountry(),
            profile.getCity(),
            profile.getFullAddress(),
            profile.getLatitude(),
            profile.getLongitude(),
            profile.getLatitude(),
            profile.getLongitude(),
            normalizeOptional(user.getEmail()),
            normalizeOptional(user.getPhoneNumber()),
            normalizeOptional(user.getPhoneNumber()),
            normalizeOptional(profile.getInstagram()),
            normalizeOptional(profile.getFacebook()),
            normalizeOptional(profile.getTiktok()),
            normalizeOptional(profile.getWebsite()),
            normalizeOptional(profile.getWhatsapp()),
            categorySupport.mapCategories(profile.getCategories()),
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
        if (profileId == null || !geocodingInFlight.add(profileId)) {
            return profile;
        }
        CompletableFuture.runAsync(() -> {
            try {
                Coordinates coordinates = geocodeLocation(locationToGeocode);
                if (coordinates != null) {
                    professionalProfileRepository.updateCoordinates(
                        profileId,
                        coordinates.latitude(),
                        coordinates.longitude()
                    );
                }
            } finally {
                geocodingInFlight.remove(profileId);
            }
        }, geocodingExecutor);
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
            categorySupport.resolvePrimaryRubro(profile),
            profile.getLocation(),
            profile.getPublicHeadline(),
            categorySupport.mapCategories(profile.getCategories())
        );
    }

    private boolean hasAnyStructuredLocationInput(ProfesionalBusinessProfileUpdateRequest request) {
        return request.getCountry() != null || request.getCity() != null || request.getFullAddress() != null;
    }

    private String normalizeLocationPart(String value) {
        String normalized = normalizeOptional(value);
        return normalized == null ? null : normalized;
    }

    private String composeLocation(String fullAddress, String city, String country) {
        return String.join(", ", fullAddress.trim(), city.trim(), country.trim());
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
