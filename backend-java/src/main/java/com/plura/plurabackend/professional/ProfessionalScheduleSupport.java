package com.plura.plurabackend.professional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDayDto;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalSchedulePauseDto;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleRangeDto;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Consumer;
import java.util.function.IntUnaryOperator;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class ProfessionalScheduleSupport {

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

    private ProfessionalScheduleSupport() {}

    public static ProfesionalScheduleDto readStoredSchedule(
        ObjectMapper objectMapper,
        String rawScheduleJson,
        int defaultSlotDurationMinutes,
        IntUnaryOperator slotDurationNormalizer
    ) {
        if (rawScheduleJson == null || rawScheduleJson.isBlank()) {
            return createDefaultSchedule(defaultSlotDurationMinutes);
        }

        try {
            ProfesionalScheduleDto parsed = objectMapper.readValue(rawScheduleJson, ProfesionalScheduleDto.class);
            return normalizeSchedule(parsed, defaultSlotDurationMinutes, slotDurationNormalizer);
        } catch (JsonProcessingException exception) {
            return createDefaultSchedule(defaultSlotDurationMinutes);
        }
    }

    public static ProfesionalScheduleDto normalizeSchedule(
        ProfesionalScheduleDto source,
        int defaultSlotDurationMinutes,
        IntUnaryOperator slotDurationNormalizer
    ) {
        if (source == null) {
            return createDefaultSchedule(defaultSlotDurationMinutes);
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
            slotDurationNormalizer.applyAsInt(source.getSlotDurationMinutes() == null
                ? defaultSlotDurationMinutes
                : source.getSlotDurationMinutes())
        );
    }

    public static void validateSchedule(ProfesionalScheduleDto schedule, Consumer<Integer> slotDurationValidator) {
        if (schedule == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Horario inválido");
        }
        if (schedule.getSlotDurationMinutes() != null) {
            slotDurationValidator.accept(schedule.getSlotDurationMinutes());
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

    public static boolean isDatePaused(LocalDate date, List<ProfesionalSchedulePauseDto> pauses) {
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
                // Ignora pausas inválidas persistidas para no romper endpoints.
            }
        }

        return false;
    }

    private static ProfesionalScheduleDto createDefaultSchedule(int defaultSlotDurationMinutes) {
        List<ProfesionalScheduleDayDto> days = new ArrayList<>();
        DAY_ORDER.forEach(day -> days.add(new ProfesionalScheduleDayDto(day, false, false, new ArrayList<>())));
        return new ProfesionalScheduleDto(days, new ArrayList<>(), defaultSlotDurationMinutes);
    }

    private static String normalizeDayKey(String rawDay) {
        if (rawDay == null) {
            return "";
        }
        String normalized = rawDay.trim().toLowerCase();
        if (normalized.isBlank()) {
            return "";
        }
        return DAY_ALIASES.getOrDefault(normalized, normalized);
    }

    private static void validateDayRanges(String day, List<ProfesionalScheduleRangeDto> ranges) {
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

    private static void validatePauses(List<ProfesionalSchedulePauseDto> pauses) {
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
}
