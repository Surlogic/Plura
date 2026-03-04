package com.plura.plurabackend.availability;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.availability.model.AvailableSlot;
import com.plura.plurabackend.availability.model.AvailableSlotStatus;
import com.plura.plurabackend.availability.repository.AvailableSlotRepository;
import com.plura.plurabackend.booking.model.Booking;
import com.plura.plurabackend.booking.model.BookingStatus;
import com.plura.plurabackend.booking.repository.BookingRepository;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDayDto;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalSchedulePauseDto;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleRangeDto;
import com.plura.plurabackend.professional.service.model.ProfesionalService;
import com.plura.plurabackend.professional.service.repository.ProfesionalServiceRepository;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class AvailableSlotService {

    private static final int DEFAULT_LOOKAHEAD_DAYS = 30;
    private static final int DEFAULT_SLOT_DURATION_MINUTES = 15;
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

    private static final Map<String, String> DAY_ALIASES = Map.ofEntries(
        Map.entry("monday", "mon"),
        Map.entry("tuesday", "tue"),
        Map.entry("wednesday", "wed"),
        Map.entry("thursday", "thu"),
        Map.entry("friday", "fri"),
        Map.entry("saturday", "sat"),
        Map.entry("sunday", "sun")
    );

    private final AvailableSlotRepository availableSlotRepository;
    private final ProfessionalProfileRepository professionalProfileRepository;
    private final ProfesionalServiceRepository profesionalServiceRepository;
    private final BookingRepository bookingRepository;
    private final ObjectMapper objectMapper;
    private final ZoneId appZoneId;
    private final Map<Long, ReentrantLock> profileRebuildLocks = new ConcurrentHashMap<>();
    private final TransactionTemplate transactionTemplate;

    private record BookedWindow(LocalDateTime start, LocalDateTime end) {}

    public AvailableSlotService(
        AvailableSlotRepository availableSlotRepository,
        ProfessionalProfileRepository professionalProfileRepository,
        ProfesionalServiceRepository profesionalServiceRepository,
        BookingRepository bookingRepository,
        ObjectMapper objectMapper,
        PlatformTransactionManager transactionManager,
        @Value("${app.timezone:America/Montevideo}") String appTimezone
    ) {
        this.availableSlotRepository = availableSlotRepository;
        this.professionalProfileRepository = professionalProfileRepository;
        this.profesionalServiceRepository = profesionalServiceRepository;
        this.bookingRepository = bookingRepository;
        this.objectMapper = objectMapper;
        this.appZoneId = ZoneId.of(appTimezone);
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    public void rebuildAllNextDays() {
        rebuildAllNextDays(DEFAULT_LOOKAHEAD_DAYS);
    }

    private static final int REBUILD_BATCH_SIZE = 50;

    public void rebuildAllNextDays(int days) {
        int lookaheadDays = normalizeLookahead(days);
        LocalDate from = LocalDate.now(appZoneId);
        LocalDate to = from.plusDays(lookaheadDays);

        List<ProfessionalProfile> activeProfiles = professionalProfileRepository.findAllActiveWithRelations();
        for (int i = 0; i < activeProfiles.size(); i += REBUILD_BATCH_SIZE) {
            List<ProfessionalProfile> batch = activeProfiles.subList(
                i, Math.min(i + REBUILD_BATCH_SIZE, activeProfiles.size())
            );
            transactionTemplate.executeWithoutResult(status -> rebuildBatch(batch, from, to));
        }
    }

    protected void rebuildBatch(List<ProfessionalProfile> profiles, LocalDate from, LocalDate to) {
        for (ProfessionalProfile profile : profiles) {
            rebuildForProfileWithLock(profile, from, to);
        }
    }

    public void rebuildProfessionalNextDays(Long professionalId) {
        rebuildProfessionalNextDays(professionalId, DEFAULT_LOOKAHEAD_DAYS);
    }

    public void rebuildProfessionalNextDays(Long professionalId, int days) {
        if (professionalId == null) {
            return;
        }
        int lookaheadDays = normalizeLookahead(days);
        LocalDate from = LocalDate.now(appZoneId);
        LocalDate to = from.plusDays(lookaheadDays);

        professionalProfileRepository.findById(professionalId)
            .ifPresent(profile -> transactionTemplate.executeWithoutResult(
                status -> rebuildForProfileWithLock(profile, from, to)
            ));
    }

    public void rebuildProfessionalDay(Long professionalId, LocalDate date) {
        if (professionalId == null || date == null) {
            return;
        }

        professionalProfileRepository.findById(professionalId)
            .ifPresent(profile -> transactionTemplate.executeWithoutResult(
                status -> rebuildForProfileWithLock(profile, date, date.plusDays(1))
            ));
    }

    private void rebuildForProfileWithLock(ProfessionalProfile profile, LocalDate from, LocalDate to) {
        if (profile == null || profile.getId() == null) {
            return;
        }
        ReentrantLock lock = profileRebuildLocks.computeIfAbsent(
            profile.getId(),
            ignored -> new ReentrantLock(true)
        );
        lock.lock();
        try {
            rebuildForProfile(profile, from, to);
        } finally {
            lock.unlock();
            if (!lock.hasQueuedThreads()) {
                profileRebuildLocks.remove(profile.getId(), lock);
            }
        }
    }

    private void rebuildForProfile(ProfessionalProfile profile, LocalDate from, LocalDate to) {
        if (profile.getActive() == null || !profile.getActive()) {
            return;
        }

        // Serializa por profesional a nivel de DB hasta commit para evitar carreras entre rebuilds async.
        availableSlotRepository.lockProfessionalSlots(profile.getId());

        LocalDateTime fromDateTime = from.atStartOfDay();
        LocalDateTime toDateTime = to.atStartOfDay();
        availableSlotRepository.deleteByProfessionalAndStartAtBetween(profile.getId(), fromDateTime, toDateTime);

        List<ProfesionalService> services =
            profesionalServiceRepository.findByProfessional_IdAndActiveTrueOrderByCreatedAtDesc(profile.getId());
        if (services.isEmpty()) {
            return;
        }

        int slotDurationMinutes = resolveSlotDurationMinutes(profile);

        List<BookedWindow> bookedWindows = bookingRepository.findBookedWithServiceByProfessionalAndStartDateTimeBetween(
            profile,
            fromDateTime,
            toDateTime,
            BookingStatus.CANCELLED
        ).stream()
            .map(this::toBookedWindow)
            .toList();

        ProfesionalScheduleDto schedule = readStoredSchedule(profile.getScheduleJson());

        LocalDateTime now = LocalDateTime.now(appZoneId);
        List<AvailableSlot> slots = new ArrayList<>();
        Set<LocalDateTime> seenSlotStarts = new HashSet<>();
        for (LocalDate current = from; current.isBefore(to); current = current.plusDays(1)) {
            if (isDatePaused(current, schedule.getPauses())) {
                continue;
            }

            ProfesionalScheduleDayDto daySchedule = findDaySchedule(schedule, current);
            if (daySchedule == null || !daySchedule.isEnabled() || daySchedule.isPaused()) {
                continue;
            }

            for (ProfesionalScheduleRangeDto range : daySchedule.getRanges()) {
                if (!isValidRange(range)) {
                    continue;
                }

                LocalDateTime slotStart = current.atTime(parseTime(range.getStart()));
                LocalDateTime rangeEnd = current.atTime(parseTime(range.getEnd()));
                while (!slotStart.plusMinutes(slotDurationMinutes).isAfter(rangeEnd)) {
                    if (slotStart.isAfter(now)) {
                        LocalDateTime slotEnd = slotStart.plusMinutes(slotDurationMinutes);
                        if (!seenSlotStarts.add(slotStart)) {
                            slotStart = slotStart.plusMinutes(slotDurationMinutes);
                            continue;
                        }
                        boolean overlaps = hasOverlap(bookedWindows, slotStart, slotEnd);
                        AvailableSlot slot = new AvailableSlot();
                        slot.setProfessional(profile);
                        slot.setStartAt(slotStart);
                        slot.setEndAt(slotEnd);
                        slot.setStatus(
                            overlaps
                                ? AvailableSlotStatus.BOOKED
                                : AvailableSlotStatus.AVAILABLE
                        );
                        slots.add(slot);
                    }
                    slotStart = slotStart.plusMinutes(slotDurationMinutes);
                }
            }
        }

        if (!slots.isEmpty()) {
            availableSlotRepository.saveAll(slots);
        }
    }

    private int normalizeLookahead(int days) {
        if (days <= 0) {
            return DEFAULT_LOOKAHEAD_DAYS;
        }
        return Math.min(days, 60);
    }

    private ProfesionalScheduleDayDto findDaySchedule(ProfesionalScheduleDto schedule, LocalDate date) {
        String dayKey = dayKeyFromDate(date);
        return schedule.getDays().stream()
            .filter(day -> day != null && dayKey.equalsIgnoreCase(normalizeDayKey(day.getDay())))
            .findFirst()
            .orElse(null);
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
        return new ProfesionalScheduleDto(
            List.of(
                new ProfesionalScheduleDayDto("mon", false, false, List.of()),
                new ProfesionalScheduleDayDto("tue", false, false, List.of()),
                new ProfesionalScheduleDayDto("wed", false, false, List.of()),
                new ProfesionalScheduleDayDto("thu", false, false, List.of()),
                new ProfesionalScheduleDayDto("fri", false, false, List.of()),
                new ProfesionalScheduleDayDto("sat", false, false, List.of()),
                new ProfesionalScheduleDayDto("sun", false, false, List.of())
            ),
            List.of(),
            DEFAULT_SLOT_DURATION_MINUTES
        );
    }

    private ProfesionalScheduleDto normalizeSchedule(ProfesionalScheduleDto source) {
        if (source == null || source.getDays() == null) {
            return createDefaultSchedule();
        }
        Map<String, ProfesionalScheduleDayDto> byDay = new LinkedHashMap<>();
        source.getDays().forEach(day -> {
            if (day == null || day.getDay() == null) return;
            String key = normalizeDayKey(day.getDay());
            if (key.isBlank()) return;
            byDay.put(key, day);
        });

        List<String> order = List.of("mon", "tue", "wed", "thu", "fri", "sat", "sun");
        List<ProfesionalScheduleDayDto> normalizedDays = order.stream()
            .map(key -> {
                ProfesionalScheduleDayDto day = byDay.get(key);
                if (day == null) {
                    return new ProfesionalScheduleDayDto(key, false, false, List.of());
                }
                List<ProfesionalScheduleRangeDto> ranges = day.getRanges() == null
                    ? List.of()
                    : day.getRanges();
                return new ProfesionalScheduleDayDto(key, day.isEnabled(), day.isPaused(), ranges);
            })
            .toList();

        List<ProfesionalSchedulePauseDto> pauses = source.getPauses() == null
            ? List.of()
            : source.getPauses();

        return new ProfesionalScheduleDto(
            normalizedDays,
            pauses,
            normalizeSlotDurationOrDefault(source.getSlotDurationMinutes())
        );
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
            } catch (DateTimeParseException ignored) {
                // Ignora pausas inválidas para no romper cálculo global.
            }
        }
        return false;
    }

    private boolean isValidRange(ProfesionalScheduleRangeDto range) {
        if (range == null || range.getStart() == null || range.getEnd() == null) {
            return false;
        }
        try {
            LocalTime start = parseTime(range.getStart());
            LocalTime end = parseTime(range.getEnd());
            return start.isBefore(end);
        } catch (DateTimeParseException exception) {
            return false;
        }
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

    private String normalizeDayKey(String rawDay) {
        if (rawDay == null) return "";
        String normalized = rawDay.trim().toLowerCase(Locale.ROOT);
        if (normalized.isBlank()) return "";
        return DAY_ALIASES.getOrDefault(normalized, normalized);
    }

    private LocalTime parseTime(String rawTime) {
        return LocalTime.parse(rawTime.trim());
    }

    private int parseDurationToMinutes(String rawDuration) {
        if (rawDuration == null || rawDuration.isBlank()) {
            return 30;
        }

        String normalized = rawDuration.trim().toLowerCase(Locale.ROOT);
        if (normalized.matches("^\\d+$")) {
            int minutes = Integer.parseInt(normalized);
            return minutes > 0 ? minutes : 30;
        }

        Matcher matcher = Pattern.compile("\\d+").matcher(normalized);
        List<Integer> numbers = new ArrayList<>();
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

    private int resolvePostBufferMinutes(ProfesionalService service) {
        if (service == null || service.getPostBufferMinutes() == null) {
            return 0;
        }
        return Math.max(0, service.getPostBufferMinutes());
    }

    private int resolveEffectiveDurationMinutes(ProfesionalService service) {
        return parseDurationToMinutes(service.getDuration()) + resolvePostBufferMinutes(service);
    }

    private int resolveSlotDurationMinutes(ProfessionalProfile profile) {
        if (profile == null) {
            return DEFAULT_SLOT_DURATION_MINUTES;
        }
        return normalizeSlotDurationOrDefault(profile.getSlotDurationMinutes());
    }

    private int normalizeSlotDurationOrDefault(Integer value) {
        if (value == null || !ALLOWED_SLOT_DURATIONS.contains(value)) {
            return DEFAULT_SLOT_DURATION_MINUTES;
        }
        return value;
    }

    private BookedWindow toBookedWindow(Booking booking) {
        LocalDateTime start = booking.getStartDateTime();
        int effectiveDurationMinutes = resolveEffectiveDurationMinutes(booking.getService());
        return new BookedWindow(start, start.plusMinutes(effectiveDurationMinutes));
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
}
