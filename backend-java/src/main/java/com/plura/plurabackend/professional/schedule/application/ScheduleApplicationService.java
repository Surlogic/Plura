package com.plura.plurabackend.professional.schedule.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.booking.BookingSchedulingAvailabilityGateway;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.core.cache.SlotCacheService;
import com.plura.plurabackend.professional.schedule.ProfessionalScheduleSupport;
import com.plura.plurabackend.professional.application.ProfessionalAccessSupport;
import com.plura.plurabackend.professional.application.ProfessionalSideEffectCoordinator;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDayDto;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleRangeDto;
import com.plura.plurabackend.professional.service.model.ProfesionalService;
import com.plura.plurabackend.professional.service.repository.ProfesionalServiceRepository;
import com.plura.plurabackend.professional.worker.model.ProfessionalWorkerStatus;
import com.plura.plurabackend.professional.worker.repository.ProfessionalWorkerRepository;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * ScheduleApplicationService es un servicio de negocio del modulo profesionales / agenda / aplicacion.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: professionalProfileRepository, profesionalServiceRepository, bookingRepository, slotCacheService, entre otros.
 * Foco funcional: agenda, servicios.
 */
@Service
public class ScheduleApplicationService implements BookingSchedulingAvailabilityGateway {

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");
    private static final int DEFAULT_SLOT_DURATION_MINUTES = 15;
    private static final Set<Integer> ALLOWED_SLOT_DURATIONS = Set.of(10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60);

    private final ProfessionalProfileRepository professionalProfileRepository;
    private final ProfesionalServiceRepository profesionalServiceRepository;
    private final BookingRepository bookingRepository;
    private final SlotCacheService slotCacheService;
    private final ObjectMapper objectMapper;
    private final ProfessionalAccessSupport professionalAccessSupport;
    private final ProfessionalSideEffectCoordinator sideEffectCoordinator;
    private final ProfessionalWorkerRepository professionalWorkerRepository;
    private final ZoneId systemZoneId;
    private final MeterRegistry meterRegistry;

    public ScheduleApplicationService(
        ProfessionalProfileRepository professionalProfileRepository,
        ProfesionalServiceRepository profesionalServiceRepository,
        BookingRepository bookingRepository,
        SlotCacheService slotCacheService,
        ObjectMapper objectMapper,
        ProfessionalAccessSupport professionalAccessSupport,
        ProfessionalSideEffectCoordinator sideEffectCoordinator,
        ProfessionalWorkerRepository professionalWorkerRepository,
        MeterRegistry meterRegistry,
        @Value("${app.timezone:America/Montevideo}") String appTimezone
    ) {
        this.professionalProfileRepository = professionalProfileRepository;
        this.profesionalServiceRepository = profesionalServiceRepository;
        this.bookingRepository = bookingRepository;
        this.slotCacheService = slotCacheService;
        this.objectMapper = objectMapper;
        this.professionalAccessSupport = professionalAccessSupport;
        this.sideEffectCoordinator = sideEffectCoordinator;
        this.professionalWorkerRepository = professionalWorkerRepository;
        this.meterRegistry = meterRegistry;
        this.systemZoneId = ZoneId.of(appTimezone);
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> getAvailableSlots(String slug, String rawDate, String serviceId) {
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            if (rawDate == null || rawDate.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La fecha es obligatoria");
            }
            if (serviceId == null || serviceId.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El servicio es obligatorio");
            }

            LocalDate date = parseDate(rawDate, "Formato de fecha inválido");
            ProfessionalProfile profile = professionalProfileRepository.findSchedulingProfileBySlug(slug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrado"));
            professionalAccessSupport.ensureProfessionalReservable(profile);

            String slotCacheKey = buildSlotCacheKey(profile.getId(), rawDate.trim(), serviceId.trim());
            var cachedSlots = slotCacheService.getSlots(slotCacheKey);
            if (cachedSlots.isPresent()) {
                return cachedSlots.get();
            }

            List<String> slots = calculateSlots(profile, serviceId.trim(), date, null, nowInSystemZone());
            slotCacheService.putSlots(slotCacheKey, slots);
            return slots;
        } finally {
            sample.stop(
                Timer.builder("plura.public_slots.duration")
                    .description("Public slots response duration")
                    .publishPercentileHistogram()
                    .register(meterRegistry)
            );
        }
    }

    /**
     * Evalua is slot available y devuelve una decision booleana para el llamador.
     */
    @Override
    @Transactional(readOnly = true)
    public boolean isSlotAvailable(
        Long professionalId,
        String serviceId,
        LocalDateTime startDateTime,
        Long excludedBookingId
    ) {
        if (professionalId == null || serviceId == null || startDateTime == null) {
            return false;
        }
        ProfessionalProfile profile = professionalProfileRepository.findById(professionalId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrado"));
        professionalAccessSupport.ensureProfessionalReservable(profile);
        List<String> slots = calculateSlots(
            profile,
            serviceId.trim(),
            startDateTime.toLocalDate(),
            excludedBookingId,
            nowInSystemZone()
        );
        return slots.contains(startDateTime.toLocalTime().format(TIME_FORMATTER));
    }

    @Override
    @Transactional(readOnly = true)
    public ProfesionalScheduleDto getSchedule(String rawUserId) {
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        ProfesionalScheduleDto schedule = readStoredSchedule(profile.getScheduleJson());
        schedule.setSlotDurationMinutes(resolveSlotDurationMinutes(profile.getSlotDurationMinutes()));
        return schedule;
    }

    /**
     * Actualiza agenda manteniendo reglas de negocio y consistencia de datos.
     * Tambien concentra los efectos secundarios para que el flujo quede en un estado consistente.
     */
    @Override
    @Transactional
    public ProfesionalScheduleDto updateSchedule(String rawUserId, ProfesionalScheduleDto request) {
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);

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
            String scheduleJson = objectMapper.writeValueAsString(normalized);
            profile.setScheduleJson(scheduleJson);
            professionalWorkerRepository.findByProfessional_IdAndOwnerTrueAndStatusNot(
                    profile.getId(),
                    ProfessionalWorkerStatus.REMOVED
                )
                .ifPresent(ownerWorker -> {
                    ownerWorker.setScheduleJson(scheduleJson);
                    ownerWorker.setSlotDurationMinutes(slotDurationMinutes);
                    professionalWorkerRepository.save(ownerWorker);
                });
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo guardar el horario");
        }

        professionalProfileRepository.save(profile);
        sideEffectCoordinator.onScheduleChanged(profile, 30);
        return normalized;
    }

    /**
     * Calcula slots a partir de reglas y datos persistidos.
     */
    private List<String> calculateSlots(
        ProfessionalProfile profile,
        String serviceId,
        LocalDate date,
        Long excludedBookingId,
        LocalDateTime now
    ) {
        ProfesionalService service = profesionalServiceRepository.findById(serviceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Servicio no encontrado"));
        if (service.getProfessional() == null || !service.getProfessional().getId().equals(profile.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Servicio no encontrado");
        }
        professionalAccessSupport.ensureServiceReservable(service);

        ProfesionalScheduleDto schedule = readStoredSchedule(profile.getScheduleJson());
        List<BookedWindow> bookedWindows = excludedBookingId == null
            ? loadBookedWindows(profile, date)
            : loadBookedWindows(profile, date, excludedBookingId);
        return calculateAvailableSlots(
            date,
            service,
            schedule,
            bookedWindows,
            now,
            resolveSlotDurationMinutes(profile.getSlotDurationMinutes())
        );
    }

    /**
     * Carga la seccion booked windows desde base de datos o datos agregados y la deja lista para la respuesta.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
    private List<BookedWindow> loadBookedWindows(ProfessionalProfile profile, LocalDate date) {
        LocalDateTime dayStart = date.atStartOfDay();
        LocalDateTime dayEnd = date.atTime(LocalTime.MAX);
        return bookingRepository.findBookedWithServiceByProfessionalIdAndStartDateTimeBetween(
                profile.getId(),
                dayStart,
                dayEnd,
                BookingOperationalStatus.CANCELLED
            )
            .stream()
            .map(booking -> toBookedWindow(booking))
            .toList();
    }

    /**
     * Carga la seccion booked windows desde base de datos o datos agregados y la deja lista para la respuesta.
     * Mantiene la consulta encapsulada para que el resto del codigo no repita filtros ni joins.
     */
    private List<BookedWindow> loadBookedWindows(
        ProfessionalProfile profile,
        LocalDate date,
        Long excludedBookingId
    ) {
        LocalDateTime dayStart = date.atStartOfDay();
        LocalDateTime dayEnd = date.atTime(LocalTime.MAX);
        return bookingRepository.findBookedWithServiceByProfessionalIdAndStartDateTimeBetweenExcludingBooking(
                profile.getId(),
                dayStart,
                dayEnd,
                BookingOperationalStatus.CANCELLED,
                excludedBookingId
            )
            .stream()
            .map(booking -> toBookedWindow(booking))
            .toList();
    }

    /**
     * Convierte datos internos al formato booked window esperado por el consumidor.
     */
    private BookedWindow toBookedWindow(Booking booking) {
        LocalDateTime start = booking.getStartDateTime();
        int postBufferMinutes = booking.getServicePostBufferMinutesSnapshot() == null
            ? 0
            : booking.getServicePostBufferMinutesSnapshot();
        int effectiveDurationMinutes = parseDurationToMinutes(booking.getServiceDurationSnapshot()) + postBufferMinutes;
        return new BookedWindow(start, start.plusMinutes(effectiveDurationMinutes));
    }

    /**
     * Calcula available slots a partir de reglas y datos persistidos.
     */
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
            if (range == null) {
                continue;
            }

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
                    slots.add(slotStart.toLocalTime().format(TIME_FORMATTER));
                }
                slotStart = slotStart.plusMinutes(slotDurationMinutes);
            }
        }

        return slots.stream().sorted().toList();
    }

    /**
     * Lee guardada agenda desde la fuente persistida y aplica defaults si faltan datos.
     */
    private ProfesionalScheduleDto readStoredSchedule(String rawScheduleJson) {
        return ProfessionalScheduleSupport.readStoredSchedule(
            objectMapper,
            rawScheduleJson,
            DEFAULT_SLOT_DURATION_MINUTES,
            this::normalizeSlotDurationOrDefault
        );
    }

    /**
     * Parsea fecha y convierte errores de formato en errores controlados.
     */
    private LocalDate parseDate(String rawDate, String errorMessage) {
        try {
            return LocalDate.parse(rawDate.trim());
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, errorMessage);
        }
    }

    /**
     * Construye slot cache key a partir de datos internos ya validados.
     */
    private String buildSlotCacheKey(Long professionalId, String date, String serviceId) {
        return "slots:" + professionalId + ":" + date + ":" + serviceId;
    }

    /**
     * Ejecuta la logica de dia clave from fecha manteniendola encapsulada en este componente.
     */
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

    /**
     * Ejecuta la logica de now in system zone manteniendola encapsulada en este componente.
     */
    private LocalDateTime nowInSystemZone() {
        return ZonedDateTime.now(systemZoneId).toLocalDateTime();
    }

    /**
     * Parsea hora y convierte errores de formato en errores controlados.
     */
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

    /**
     * Valida slot duration y lanza un error controlado si no cumple el contrato.
     * Esta separacion hace explicita la regla de seguridad o negocio que protege el flujo.
     */
    private void validateSlotDuration(Integer value) {
        if (value == null || !ALLOWED_SLOT_DURATIONS.contains(value)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "La duración de turnos debe ser uno de: 10, 15, 20, 25, 30, 35, 40, 45, 50, 55 o 60"
            );
        }
    }

    /**
     * Normaliza slot duracion or default para evitar variantes vacias, invalidas o inconsistentes.
     */
    private int normalizeSlotDurationOrDefault(Integer value) {
        if (value == null || !ALLOWED_SLOT_DURATIONS.contains(value)) {
            return DEFAULT_SLOT_DURATION_MINUTES;
        }
        return value;
    }

    /**
     * Resuelve slot duration minutes normalizando entradas, defaults y casos borde.
     */
    private int resolveSlotDurationMinutes(Integer value) {
        return normalizeSlotDurationOrDefault(value);
    }

    /**
     * Sanea slot duracion minutes antes de usarlo en storage, URL o persistencia.
     */
    private int sanitizeSlotDurationMinutes(Integer requested, Integer current) {
        if (requested == null) {
            return resolveSlotDurationMinutes(current);
        }
        validateSlotDuration(requested);
        return requested;
    }

    /**
     * Resuelve effective duration minutes normalizando entradas, defaults y casos borde.
     */
    private int resolveEffectiveDurationMinutes(ProfesionalService service) {
        int baseDuration = parseDurationToMinutes(service.getDuration());
        Integer rawPostBuffer = service.getPostBufferMinutes();
        int postBuffer = rawPostBuffer == null || rawPostBuffer < 0 ? 0 : rawPostBuffer;
        return baseDuration + postBuffer;
    }

    /**
     * Parsea duration to minutes y convierte errores de formato en errores controlados.
     */
    private int parseDurationToMinutes(String duration) {
        if (duration == null || duration.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Duración del servicio inválida");
        }
        String normalized = duration.trim().toLowerCase();
        String digits = normalized.replaceAll("[^0-9]", " ").trim();
        if (digits.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Duración del servicio inválida");
        }
        String[] parts = digits.split("\\s+");
        int minutes;
        if (normalized.contains("h")) {
            int hours = Integer.parseInt(parts[0]);
            int extraMinutes = parts.length > 1 ? Integer.parseInt(parts[1]) : 0;
            minutes = (hours * 60) + extraMinutes;
        } else {
            minutes = Integer.parseInt(parts[0]);
        }
        if (minutes <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Duración del servicio inválida");
        }
        return minutes;
    }

    /**
     * Evalua has overlap y devuelve una decision booleana para el llamador.
     */
    private boolean hasOverlap(
        List<BookedWindow> bookedWindows,
        LocalDateTime candidateStart,
        LocalDateTime candidateEnd
    ) {
        for (BookedWindow window : bookedWindows) {
            if (candidateStart.isBefore(window.end()) && candidateEnd.isAfter(window.start())) {
                return true;
            }
        }
        return false;
    }

    /**
     * Bloque de datos booked window usado internamente por esta clase.
     * Agrupa valores relacionados para que el calculo principal sea mas legible.
     */
    private record BookedWindow(LocalDateTime start, LocalDateTime end) {}
}
