package com.plura.plurabackend.core.availability;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.availability.model.AvailableSlot;
import com.plura.plurabackend.core.availability.model.AvailableSlotStatus;
import com.plura.plurabackend.core.availability.repository.AvailableSlotRepository;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.core.professional.ProfessionalAvailabilityGateway;
import com.plura.plurabackend.core.professional.ProfessionalAvailabilityProfileView;
import com.plura.plurabackend.core.professional.ProfessionalServiceAvailabilityView;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDayDto;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalSchedulePauseDto;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleRangeDto;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import jakarta.persistence.EntityManager;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.LongPredicate;
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
    private static final Pattern DURATION_NUMBER_PATTERN = Pattern.compile("\\d+");
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
    private final ProfessionalAvailabilityGateway professionalAvailabilityGateway;
    private final BookingRepository bookingRepository;
    private final ObjectMapper objectMapper;
    private final EntityManager entityManager;
    private final ZoneId appZoneId;
    private final Map<Long, ReentrantLock> profileRebuildLocks = new ConcurrentHashMap<>();
    private final TransactionTemplate transactionTemplate;
    private final MeterRegistry meterRegistry;
    private final Timer slotsGenerationTimer;
    private final boolean nextAvailableAtEnabled;

    private record BookedWindow(LocalDateTime start, LocalDateTime end) {}

    public AvailableSlotService(
        AvailableSlotRepository availableSlotRepository,
        ProfessionalAvailabilityGateway professionalAvailabilityGateway,
        BookingRepository bookingRepository,
        ObjectMapper objectMapper,
        EntityManager entityManager,
        PlatformTransactionManager transactionManager,
        MeterRegistry meterRegistry,
        @Value("${feature.availability.next-available-at-enabled:false}") boolean nextAvailableAtEnabled,
        @Value("${app.timezone:America/Montevideo}") String appTimezone
    ) {
        this.availableSlotRepository = availableSlotRepository;
        this.professionalAvailabilityGateway = professionalAvailabilityGateway;
        this.bookingRepository = bookingRepository;
        this.objectMapper = objectMapper;
        this.entityManager = entityManager;
        this.appZoneId = ZoneId.of(appTimezone);
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.meterRegistry = meterRegistry;
        this.slotsGenerationTimer = Timer.builder("plura.slots.generation.time")
            .description("Available slots generation time")
            .register(meterRegistry);
        this.nextAvailableAtEnabled = nextAvailableAtEnabled;
    }

    public void rebuildAllNextDays() {
        rebuildAllNextDays(DEFAULT_LOOKAHEAD_DAYS);
    }

    private static final int REBUILD_BATCH_SIZE = 50;

    public void rebuildAllNextDays(int days) {
        rebuildFilteredNextDays(days, professionalId -> true);
    }

    public void rebuildShardNextDays(int days, int shardCount, int shardIndex) {
        int normalizedShardCount = Math.max(1, shardCount);
        if (normalizedShardCount == 1) {
            rebuildAllNextDays(days);
            return;
        }
        int normalizedShardIndex = Math.floorMod(shardIndex, normalizedShardCount);
        rebuildFilteredNextDays(
            days,
            professionalId -> Math.floorMod(professionalId, normalizedShardCount) == normalizedShardIndex
        );
    }

    private void rebuildFilteredNextDays(int days, LongPredicate includeProfile) {
        int lookaheadDays = normalizeLookahead(days);
        LocalDate from = LocalDate.now(appZoneId);
        LocalDate to = from.plusDays(lookaheadDays);

        int page = 0;
        while (true) {
            List<Long> pageItems = professionalAvailabilityGateway.findActiveProfessionalIdsPage(page, REBUILD_BATCH_SIZE);
            if (pageItems.isEmpty()) {
                break;
            }
            List<Long> filteredIds = pageItems.stream()
                .filter(id -> id != null && includeProfile.test(id))
                .toList();
            List<ProfessionalAvailabilityProfileView> batch = professionalAvailabilityGateway.findActiveProfessionalsByIds(filteredIds);
            if (!batch.isEmpty()) {
                transactionTemplate.executeWithoutResult(status -> rebuildBatch(batch, from, to));
            }
            page++;
        }
    }

    protected void rebuildBatch(List<ProfessionalAvailabilityProfileView> profiles, LocalDate from, LocalDate to) {
        List<Long> profileIds = profiles.stream()
            .map(ProfessionalAvailabilityProfileView::professionalId)
            .filter(id -> id != null && id > 0)
            .toList();
        Map<Long, List<ProfessionalServiceAvailabilityView>> servicesByProfessionalId =
            professionalAvailabilityGateway.findActiveServicesByProfessionalIds(profileIds);
        Map<Long, List<BookedWindow>> bookedWindowsByProfessionalId = loadBookedWindowsByProfessionalIds(
            profileIds,
            from.atStartOfDay(),
            to.atStartOfDay()
        );
        for (ProfessionalAvailabilityProfileView profile : profiles) {
            Long profileId = profile.professionalId();
            rebuildForProfileWithLock(
                profile,
                from,
                to,
                servicesByProfessionalId.getOrDefault(profileId, List.of()),
                bookedWindowsByProfessionalId.getOrDefault(profileId, List.of())
            );
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

        professionalAvailabilityGateway.findActiveProfessionalById(professionalId)
            .ifPresent(profile -> transactionTemplate.executeWithoutResult(
                status -> rebuildForProfileWithLock(profile, from, to)
            ));
    }

    public void rebuildProfessionalDay(Long professionalId, LocalDate date) {
        if (professionalId == null || date == null) {
            return;
        }

        professionalAvailabilityGateway.findActiveProfessionalById(professionalId)
            .ifPresent(profile -> transactionTemplate.executeWithoutResult(
                status -> rebuildForProfileWithLock(profile, date, date.plusDays(1))
            ));
    }

    private void rebuildForProfileWithLock(ProfessionalAvailabilityProfileView profile, LocalDate from, LocalDate to) {
        rebuildForProfileWithLock(profile, from, to, null, null);
    }

    private void rebuildForProfileWithLock(
        ProfessionalAvailabilityProfileView profile,
        LocalDate from,
        LocalDate to,
        List<ProfessionalServiceAvailabilityView> preloadedServices,
        List<BookedWindow> preloadedBookedWindows
    ) {
        if (profile == null || profile.professionalId() == null) {
            return;
        }
        ReentrantLock lock = profileRebuildLocks.computeIfAbsent(
            profile.professionalId(),
            ignored -> new ReentrantLock(true)
        );
        lock.lock();
        try {
            rebuildForProfile(profile, from, to, preloadedServices, preloadedBookedWindows);
        } finally {
            lock.unlock();
            if (!lock.hasQueuedThreads()) {
                profileRebuildLocks.remove(profile.professionalId(), lock);
            }
        }
    }

    private void rebuildForProfile(
        ProfessionalAvailabilityProfileView profile,
        LocalDate from,
        LocalDate to,
        List<ProfessionalServiceAvailabilityView> preloadedServices,
        List<BookedWindow> preloadedBookedWindows
    ) {
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            if (!profile.active()) {
                updateAvailabilitySummary(profile.professionalId(), false, null);
                return;
            }

            // Serializa por profesional a nivel de DB hasta commit para evitar carreras entre rebuilds async.
            availableSlotRepository.lockProfessionalSlots(profile.professionalId());

            LocalDateTime fromDateTime = from.atStartOfDay();
            LocalDateTime toDateTime = to.atStartOfDay();
            availableSlotRepository.deleteByProfessionalAndStartAtBetween(
                profile.professionalId(),
                fromDateTime,
                toDateTime
            );

            List<ProfessionalServiceAvailabilityView> services = preloadedServices == null
                ? professionalAvailabilityGateway.findActiveServicesByProfessionalId(profile.professionalId())
                : preloadedServices;
            if (services.isEmpty()) {
                updateAvailabilitySummary(profile.professionalId(), false, null);
                return;
            }

            int slotDurationMinutes = resolveSlotDurationMinutes(profile);

            List<BookedWindow> bookedWindows = preloadedBookedWindows == null
                ? mergeBookedWindows(
                    bookingRepository.findBookedWithServiceByProfessionalIdAndStartDateTimeBetween(
                        profile.professionalId(),
                        fromDateTime,
                        toDateTime,
                        BookingOperationalStatus.CANCELLED
                    ).stream()
                        .map(this::toBookedWindow)
                        .toList()
                )
                : preloadedBookedWindows;

            ProfesionalScheduleDto schedule = readStoredSchedule(profile.scheduleJson());

            LocalDateTime now = LocalDateTime.now(appZoneId);
            LocalDate today = LocalDate.now(appZoneId);
            List<AvailableSlot> slots = new ArrayList<>();
            Set<LocalDateTime> seenSlotStarts = new HashSet<>();
            boolean hasAvailabilityToday = false;
            LocalDateTime nextAvailableAt = null;
            ProfessionalProfile professionalReference = entityManager.getReference(
                ProfessionalProfile.class,
                profile.professionalId()
            );
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
                            slot.setProfessional(professionalReference);
                            slot.setStartAt(slotStart);
                            slot.setEndAt(slotEnd);
                            slot.setStatus(
                                overlaps
                                    ? AvailableSlotStatus.BOOKED
                                    : AvailableSlotStatus.AVAILABLE
                            );
                            if (!overlaps && current.equals(today)) {
                                hasAvailabilityToday = true;
                            }
                            if (!overlaps && (nextAvailableAt == null || slotStart.isBefore(nextAvailableAt))) {
                                nextAvailableAt = slotStart;
                            }
                            slots.add(slot);
                        }
                        slotStart = slotStart.plusMinutes(slotDurationMinutes);
                    }
                }
            }

            if (!slots.isEmpty()) {
                availableSlotRepository.saveAll(slots);
            }
            updateAvailabilitySummary(profile.professionalId(), hasAvailabilityToday, nextAvailableAt);
        } finally {
            sample.stop(slotsGenerationTimer);
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

        Matcher matcher = DURATION_NUMBER_PATTERN.matcher(normalized);
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

    private int resolvePostBufferMinutes(ProfessionalServiceAvailabilityView service) {
        if (service == null || service.postBufferMinutes() == null) {
            return 0;
        }
        return Math.max(0, service.postBufferMinutes());
    }

    private int resolveEffectiveDurationMinutes(ProfessionalServiceAvailabilityView service) {
        return parseDurationToMinutes(service.duration()) + resolvePostBufferMinutes(service);
    }

    private int resolveSlotDurationMinutes(ProfessionalAvailabilityProfileView profile) {
        if (profile == null) {
            return DEFAULT_SLOT_DURATION_MINUTES;
        }
        return normalizeSlotDurationOrDefault(profile.slotDurationMinutes());
    }

    private int normalizeSlotDurationOrDefault(Integer value) {
        if (value == null || !ALLOWED_SLOT_DURATIONS.contains(value)) {
            return DEFAULT_SLOT_DURATION_MINUTES;
        }
        return value;
    }

    private BookedWindow toBookedWindow(Booking booking) {
        LocalDateTime start = booking.getStartDateTime();
        int effectiveDurationMinutes = parseDurationToMinutes(booking.getServiceDurationSnapshot())
            + Math.max(0, booking.getServicePostBufferMinutesSnapshot() == null ? 0 : booking.getServicePostBufferMinutesSnapshot());
        return new BookedWindow(start, start.plusMinutes(effectiveDurationMinutes));
    }

    private boolean hasOverlap(
        List<BookedWindow> bookedWindows,
        LocalDateTime candidateStart,
        LocalDateTime candidateEnd
    ) {
        if (bookedWindows == null || bookedWindows.isEmpty()) {
            return false;
        }
        int firstWindowStartingAfterCandidateEnd = lowerBoundByStart(bookedWindows, candidateEnd);
        if (firstWindowStartingAfterCandidateEnd <= 0) {
            return false;
        }
        BookedWindow previousWindow = bookedWindows.get(firstWindowStartingAfterCandidateEnd - 1);
        return candidateStart.isBefore(previousWindow.end()) && candidateEnd.isAfter(previousWindow.start());
    }

    private int lowerBoundByStart(List<BookedWindow> windows, LocalDateTime threshold) {
        int low = 0;
        int high = windows.size();
        while (low < high) {
            int mid = (low + high) >>> 1;
            if (windows.get(mid).start().isBefore(threshold)) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }
        return low;
    }

    private Map<Long, List<BookedWindow>> loadBookedWindowsByProfessionalIds(
        List<Long> profileIds,
        LocalDateTime from,
        LocalDateTime to
    ) {
        if (profileIds == null || profileIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, List<BookedWindow>> result = new LinkedHashMap<>();
        List<Booking> bookings = bookingRepository.findBookedWithServiceByProfessionalIdsAndStartDateTimeBetween(
            profileIds,
            from,
            to,
            BookingOperationalStatus.CANCELLED
        );
        for (Booking booking : bookings) {
            if (booking == null || booking.getProfessionalId() == null) {
                continue;
            }
            result.computeIfAbsent(booking.getProfessionalId(), ignored -> new ArrayList<>())
                .add(toBookedWindow(booking));
        }
        result.replaceAll((ignored, windows) -> mergeBookedWindows(windows));
        return result;
    }

    private List<BookedWindow> mergeBookedWindows(List<BookedWindow> bookedWindows) {
        if (bookedWindows == null || bookedWindows.isEmpty()) {
            return List.of();
        }
        List<BookedWindow> sorted = bookedWindows.stream()
            .filter(window -> window != null && window.start() != null && window.end() != null)
            .sorted(Comparator.comparing(BookedWindow::start).thenComparing(BookedWindow::end))
            .toList();
        if (sorted.isEmpty()) {
            return List.of();
        }
        List<BookedWindow> merged = new ArrayList<>();
        BookedWindow current = sorted.get(0);
        for (int i = 1; i < sorted.size(); i++) {
            BookedWindow candidate = sorted.get(i);
            if (!candidate.start().isAfter(current.end())) {
                LocalDateTime mergedEnd = candidate.end().isAfter(current.end()) ? candidate.end() : current.end();
                current = new BookedWindow(current.start(), mergedEnd);
                continue;
            }
            merged.add(current);
            current = candidate;
        }
        merged.add(current);
        return List.copyOf(merged);
    }

    private void updateAvailabilitySummary(
        Long profileId,
        boolean hasAvailabilityToday,
        LocalDateTime nextAvailableAt
    ) {
        if (nextAvailableAtEnabled) {
            professionalAvailabilityGateway.updateAvailabilitySummary(profileId, hasAvailabilityToday, nextAvailableAt);
            return;
        }
        professionalAvailabilityGateway.updateHasAvailabilityToday(profileId, hasAvailabilityToday);
    }
}
