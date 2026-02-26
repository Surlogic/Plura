package com.plura.plurabackend.professional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.booking.dto.ProfessionalBookingResponse;
import com.plura.plurabackend.booking.dto.ProfessionalBookingUpdateRequest;
import com.plura.plurabackend.booking.dto.PublicBookingRequest;
import com.plura.plurabackend.booking.dto.PublicBookingResponse;
import com.plura.plurabackend.booking.model.Booking;
import com.plura.plurabackend.booking.model.BookingStatus;
import com.plura.plurabackend.booking.repository.BookingRepository;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProfesionalPublicPageService {

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

    private final ProfessionalProfileRepository professionalProfileRepository;
    private final ProfesionalServiceRepository profesionalServiceRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final ZoneId systemZoneId;

    public ProfesionalPublicPageService(
        ProfessionalProfileRepository professionalProfileRepository,
        ProfesionalServiceRepository profesionalServiceRepository,
        BookingRepository bookingRepository,
        UserRepository userRepository,
        @Value("${app.timezone:America/Montevideo}") String appTimezone,
        ObjectMapper objectMapper
    ) {
        this.professionalProfileRepository = professionalProfileRepository;
        this.profesionalServiceRepository = profesionalServiceRepository;
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
        this.systemZoneId = ZoneId.of(appTimezone);
    }

    public ProfesionalPublicPageResponse getPublicPageBySlug(String slug) {
        ProfessionalProfile profile = professionalProfileRepository.findBySlug(slug)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profesional no encontrado"));
        ensurePublicProfessionalIsActive(profile);
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
        Set<LocalTime> bookedTimes = loadBookedTimes(profile, date);
        return calculateAvailableSlots(date, service, schedule, bookedTimes, now);
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
        Set<LocalTime> bookedTimes = loadBookedTimes(profile, bookingDate);
        if (bookedTimes.contains(startDateTime.toLocalTime())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El horario ya fue reservado.");
        }
        List<String> availableSlots = calculateAvailableSlots(bookingDate, service, schedule, bookedTimes, now);
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
        return mapProfessionalBooking(saved);
    }

    public List<ProfesionalPublicSummaryResponse> listPublicProfessionals(Integer limit) {
        List<ProfessionalProfile> profiles = professionalProfileRepository.findAll(
            Sort.by(Sort.Direction.DESC, "createdAt")
        ).stream()
            .filter(this::isProfessionalActive)
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
        ProfessionalProfile profile = loadProfessionalByUserId(rawUserId);
        User user = profile.getUser();

        if (request.getFullName() != null) {
            String fullName = request.getFullName().trim();
            if (fullName.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre no puede estar vacío");
            }
            user.setFullName(fullName);
        }

        if (request.getPhoneNumber() != null) {
            String phone = request.getPhoneNumber().trim();
            if (phone.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El teléfono no puede estar vacío");
            }
            user.setPhoneNumber(phone);
        }

        if (request.getRubro() != null) {
            String rubro = request.getRubro().trim();
            if (rubro.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El rubro no puede estar vacío");
            }
            profile.setRubro(rubro);
        }

        if (request.getLocation() != null) {
            String location = request.getLocation().trim();
            profile.setLocation(location.isBlank() ? null : location);
        }

        userRepository.save(user);
        professionalProfileRepository.save(profile);
    }

    public ProfesionalScheduleDto getSchedule(String rawUserId) {
        ProfessionalProfile profile = loadProfessionalByUserId(rawUserId);
        return readStoredSchedule(profile.getScheduleJson());
    }

    public ProfesionalScheduleDto updateSchedule(
        String rawUserId,
        ProfesionalScheduleDto request
    ) {
        ProfessionalProfile profile = loadProfessionalByUserId(rawUserId);

        validateSchedule(request);
        ProfesionalScheduleDto normalized = normalizeSchedule(request);

        try {
            profile.setScheduleJson(objectMapper.writeValueAsString(normalized));
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "No se pudo guardar el horario"
            );
        }

        professionalProfileRepository.save(profile);
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
        service.setActive(request.getActive() == null ? true : request.getActive());

        ProfesionalService saved = profesionalServiceRepository.save(service);
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
        if (request.getActive() != null) {
            service.setActive(request.getActive());
        }

        ProfesionalService saved = profesionalServiceRepository.save(service);
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

    private Set<LocalTime> loadBookedTimes(ProfessionalProfile profile, LocalDate date) {
        LocalDateTime dayStart = date.atStartOfDay();
        LocalDateTime dayEnd = date.atTime(LocalTime.MAX);
        return bookingRepository.findBookedStartDateTimes(profile, dayStart, dayEnd, BookingStatus.CANCELLED)
            .stream()
            .map(LocalDateTime::toLocalTime)
            .collect(Collectors.toSet());
    }

    private List<String> calculateAvailableSlots(
        LocalDate date,
        ProfesionalService service,
        ProfesionalScheduleDto schedule,
        Set<LocalTime> bookedTimes,
        LocalDateTime now
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

        int durationMinutes = parseDurationToMinutes(service.getDuration());
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

            while (!slotStart.plusMinutes(durationMinutes).isAfter(rangeEndDateTime)) {
                LocalTime slotTime = slotStart.toLocalTime();
                if (slotStart.isAfter(now) && !bookedTimes.contains(slotTime)) {
                    slots.add(slotTime.format(TIME_FORMATTER));
                }
                slotStart = slotStart.plusMinutes(durationMinutes);
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
        return new ProfesionalScheduleDto(days, new ArrayList<>());
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

        return new ProfesionalScheduleDto(normalizedDays, normalizedPauses);
    }

    private void validateSchedule(ProfesionalScheduleDto schedule) {
        if (schedule == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Horario inválido");
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

    private ProfesionalPublicPageResponse mapToPublicPage(ProfessionalProfile profile) {
        User user = profile.getUser();
        ProfesionalScheduleDto schedule = readStoredSchedule(profile.getScheduleJson());
        List<ProfesionalServiceResponse> services = profesionalServiceRepository
            .findByProfessional_IdOrderByCreatedAtDesc(profile.getId())
            .stream()
            .filter(this::isServiceActive)
            .map(this::mapService)
            .collect(Collectors.toList());

        return new ProfesionalPublicPageResponse(
            String.valueOf(profile.getId()),
            profile.getSlug(),
            user.getFullName(),
            profile.getRubro(),
            profile.getPublicHeadline(),
            profile.getPublicAbout(),
            profile.getLocation(),
            profile.getPublicPhotos(),
            schedule,
            services
        );
    }

    private ProfesionalServiceResponse mapService(ProfesionalService service) {
        return new ProfesionalServiceResponse(
            service.getId(),
            service.getName(),
            service.getPrice(),
            service.getDuration(),
            service.getActive()
        );
    }

    private ProfessionalBookingResponse mapProfessionalBooking(Booking booking) {
        return new ProfessionalBookingResponse(
            booking.getId(),
            String.valueOf(booking.getUser().getId()),
            booking.getUser().getFullName(),
            booking.getService().getId(),
            booking.getService().getName(),
            booking.getStartDateTime().toString(),
            booking.getStatus().name()
        );
    }

    private ProfesionalPublicSummaryResponse mapToSummary(ProfessionalProfile profile) {
        User user = profile.getUser();
        return new ProfesionalPublicSummaryResponse(
            String.valueOf(profile.getId()),
            profile.getSlug(),
            user.getFullName(),
            profile.getRubro(),
            profile.getLocation(),
            profile.getPublicHeadline()
        );
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
