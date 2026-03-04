package com.plura.plurabackend.professional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.availability.AvailableSlotAsyncDispatcher;
import com.plura.plurabackend.availability.AvailableSlotService;
import com.plura.plurabackend.booking.dto.ProfessionalBookingResponse;
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
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDayDto;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalSchedulePauseDto;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleRangeDto;
import com.plura.plurabackend.professional.service.dto.ProfesionalServiceRequest;
import com.plura.plurabackend.professional.service.dto.ProfesionalServiceResponse;
import com.plura.plurabackend.professional.service.model.ProfesionalService;
import com.plura.plurabackend.professional.service.repository.ProfesionalServiceRepository;
import com.plura.plurabackend.user.model.User;
import com.plura.plurabackend.user.model.UserRole;
import com.plura.plurabackend.user.repository.UserRepository;
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
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProfesionalPublicPageService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ProfesionalPublicPageService.class);

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
    private final CategoryRepository categoryRepository;
    private final ProfesionalServiceRepository profesionalServiceRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final ZoneId systemZoneId;
    private final AvailableSlotService availableSlotService;
    private final AvailableSlotAsyncDispatcher availableSlotAsyncDispatcher;
    private final String mapboxToken;

    public ProfesionalPublicPageService(
        ProfessionalProfileRepository professionalProfileRepository,
        CategoryRepository categoryRepository,
        ProfesionalServiceRepository profesionalServiceRepository,
        BookingRepository bookingRepository,
        UserRepository userRepository,
        @Value("${app.timezone:America/Montevideo}") String appTimezone,
        @Value("${app.mapbox.token:}") String mapboxToken,
        ObjectMapper objectMapper,
        AvailableSlotService availableSlotService,
        AvailableSlotAsyncDispatcher availableSlotAsyncDispatcher
    ) {
        this.professionalProfileRepository = professionalProfileRepository;
        this.categoryRepository = categoryRepository;
        this.profesionalServiceRepository = profesionalServiceRepository;
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
        this.systemZoneId = ZoneId.of(appTimezone);
        this.mapboxToken = mapboxToken == null ? "" : mapboxToken.trim();
        this.availableSlotService = availableSlotService;
        this.availableSlotAsyncDispatcher = availableSlotAsyncDispatcher;
    }

    public ProfesionalPublicPageResponse getPublicPageBySlug(String slug) {
        ProfessionalProfile profile = professionalProfileRepository.findBySlug(slug)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrado"));
        ensurePublicProfessionalIsActive(profile);
        profile = ensurePublicCoordinates(profile);
        return mapToPublicPage(profile);
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

        ProfesionalService service = profesionalServiceRepository.findById(serviceId.trim())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Servicio no encontrado"));
        if (!service.getProfessional().getId().equals(profile.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Servicio no encontrado");
        }
        ensureServiceReservable(service);

        ProfesionalScheduleDto schedule = readStoredSchedule(profile.getScheduleJson());
        LocalDateTime now = nowInSystemZone();
        List<BookedWindow> bookedWindows = loadBookedWindows(profile, date);
        return calculateAvailableSlots(
            date,
            service,
            schedule,
            bookedWindows,
            now,
            resolveSlotDurationMinutes(profile.getSlotDurationMinutes())
        );
    }

    @Transactional
    public PublicBookingResponse createPublicBooking(
        String slug,
        PublicBookingRequest request,
        String rawUserId
    ) {
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

        return new PublicBookingResponse(
            saved.getId(),
            saved.getStatus().name(),
            saved.getStartDateTime().toString(),
            saved.getService().getId(),
            String.valueOf(saved.getProfessional().getId()),
            String.valueOf(saved.getUser().getId())
        );
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
        List<ProfessionalProfile> profiles = professionalProfileRepository.findAll(
            Sort.by(Sort.Direction.DESC, "createdAt")
        ).stream()
            .filter(this::isProfessionalActive)
            .filter(profile -> matchesCategoryFilter(profile, categoryId, normalizedCategorySlug))
            .toList();

        if (limit != null && limit > 0 && profiles.size() > limit) {
            profiles = profiles.subList(0, limit);
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

        return profiles.stream()
            .map(this::mapToSummary)
            .collect(Collectors.toList());
    }

    public ProfesionalPublicPageResponse getPublicPageByProfesionalId(String rawUserId) {
        ProfessionalProfile profile = loadProfessionalByUserId(rawUserId);
        ensureSlug(profile);
        profile = ensurePublicCoordinates(profile);
        return mapToPublicPage(profile);
    }

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
        }

        ensureSlug(profile);
        profile = professionalProfileRepository.save(profile);

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
        }

        userRepository.save(user);
        profile = professionalProfileRepository.save(profile);
        professionalProfileRepository.updateCoordinates(
            profile.getId(),
            profile.getLatitude(),
            profile.getLongitude()
        );
    }

    public ProfesionalScheduleDto getSchedule(String rawUserId) {
        ProfessionalProfile profile = loadProfessionalByUserId(rawUserId);
        ProfesionalScheduleDto schedule = readStoredSchedule(profile.getScheduleJson());
        schedule.setSlotDurationMinutes(resolveSlotDurationMinutes(profile.getSlotDurationMinutes()));
        return schedule;
    }

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
        service.setName(request.getName());
        service.setPrice(request.getPrice());
        service.setDuration(request.getDuration());
        service.setPostBufferMinutes(sanitizePostBufferMinutes(request.getPostBufferMinutes()));
        service.setActive(request.getActive() == null ? true : request.getActive());

        ProfesionalService saved = profesionalServiceRepository.save(service);
        requestAvailabilityRebuild(profile.getId(), 30);
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
            service.setName(request.getName());
        }
        if (request.getPrice() != null) {
            service.setPrice(request.getPrice());
        }
        if (request.getDuration() != null) {
            service.setDuration(request.getDuration());
        }
        if (request.getPostBufferMinutes() != null) {
            service.setPostBufferMinutes(sanitizePostBufferMinutes(request.getPostBufferMinutes()));
        }
        if (request.getActive() != null) {
            service.setActive(request.getActive());
        }

        ProfesionalService saved = profesionalServiceRepository.save(service);
        requestAvailabilityRebuild(profile.getId(), 30);
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

        return new ProfesionalPublicPageResponse(
            String.valueOf(profile.getId()),
            profile.getSlug(),
            user.getFullName(),
            resolvePrimaryRubro(profile),
            profile.getPublicHeadline(),
            profile.getPublicAbout(),
            profile.getLogoUrl(),
            profile.getLocation(),
            profile.getLatitude(),
            profile.getLongitude(),
            mapCategories(profile.getCategories()),
            profile.getPublicPhotos(),
            schedule,
            services
        );
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
            service.getPrice(),
            service.getDuration(),
            resolvePostBufferMinutes(service),
            service.getActive()
        );
    }

    private ProfesionalServiceResponse mapPublicService(ProfesionalService service) {
        return new ProfesionalServiceResponse(
            service.getId(),
            service.getName(),
            service.getPrice(),
            service.getDuration(),
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
