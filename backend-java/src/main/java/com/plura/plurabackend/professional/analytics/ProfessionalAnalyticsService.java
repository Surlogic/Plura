package com.plura.plurabackend.professional.analytics;

import com.plura.plurabackend.core.booking.dto.ProfessionalBookingResponse;
import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.professional.analytics.dto.ProfessionalAnalyticsSummaryResponse;
import com.plura.plurabackend.professional.application.ProfessionalAccessSupport;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.plan.AnalyticsTier;
import com.plura.plurabackend.professional.plan.PlanGuardService;
import com.plura.plurabackend.professional.schedule.ProfessionalScheduleSupport;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDayDto;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import com.plura.plurabackend.professional.schedule.application.ScheduleApplicationService;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfessionalAnalyticsService {

    private final BookingRepository bookingRepository;
    private final ProfessionalAccessSupport professionalAccessSupport;
    private final ScheduleApplicationService scheduleApplicationService;
    private final PlanGuardService planGuardService;

    public ProfessionalAnalyticsService(
        BookingRepository bookingRepository,
        ProfessionalAccessSupport professionalAccessSupport,
        ScheduleApplicationService scheduleApplicationService,
        PlanGuardService planGuardService
    ) {
        this.bookingRepository = bookingRepository;
        this.professionalAccessSupport = professionalAccessSupport;
        this.scheduleApplicationService = scheduleApplicationService;
        this.planGuardService = planGuardService;
    }

    @Transactional(readOnly = true)
    public ProfessionalAnalyticsSummaryResponse getSummary(String rawUserId, ProfessionalAnalyticsView view) {
        if (view == ProfessionalAnalyticsView.ADVANCED) {
            planGuardService.requireAnalyticsTier(rawUserId, AnalyticsTier.ADVANCED);
        } else {
            planGuardService.requireAnalyticsTier(rawUserId, AnalyticsTier.BASIC);
        }

        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);
        LocalDate weekStart = today.minusDays((today.getDayOfWeek().getValue() + 6L) % 7L);
        LocalDate weekEnd = weekStart.plusDays(6);

        List<ProfessionalBookingResponse> weeklyBookings =
            bookingRepository.findProfessionalBookingResponsesByProfessionalIdAndStartDateTimeBetween(
                profile.getId(),
                weekStart.atStartOfDay(),
                weekEnd.atTime(LocalTime.MAX)
            );

        int todayBookings = countBookingsForDate(weeklyBookings, today);
        int yesterdayBookings = countBookingsForDate(weeklyBookings, yesterday);
        int weeklyUniqueClients = (int) weeklyBookings.stream()
            .map(ProfessionalBookingResponse::getClientName)
            .filter(name -> name != null && !name.isBlank())
            .distinct()
            .count();

        ProfesionalScheduleDto schedule = scheduleApplicationService.getSchedule(rawUserId);
        int weeklyScheduledDays = countScheduledDays(schedule, weekStart, weekEnd);
        int weeklyDaysWithReservations = countWeeklyDaysWithReservations(weeklyBookings);
        int weeklyOccupancyRate = weeklyScheduledDays == 0
            ? 0
            : Math.round((weeklyDaysWithReservations * 100f) / weeklyScheduledDays);

        Integer completedBookings = null;
        Integer cancelledBookings = null;
        Integer noShowBookings = null;
        if (view == ProfessionalAnalyticsView.ADVANCED) {
            completedBookings = countByStatus(weeklyBookings, BookingOperationalStatus.COMPLETED);
            cancelledBookings = countByStatus(weeklyBookings, BookingOperationalStatus.CANCELLED);
            noShowBookings = countByStatus(weeklyBookings, BookingOperationalStatus.NO_SHOW);
        }

        return new ProfessionalAnalyticsSummaryResponse(
            todayBookings,
            yesterdayBookings,
            todayBookings - yesterdayBookings,
            weeklyUniqueClients,
            weeklyScheduledDays,
            weeklyDaysWithReservations,
            weeklyOccupancyRate,
            completedBookings,
            cancelledBookings,
            noShowBookings
        );
    }

    private int countBookingsForDate(List<ProfessionalBookingResponse> bookings, LocalDate date) {
        return (int) bookings.stream()
            .map(this::parseStartDate)
            .filter(startDate -> startDate != null && date.equals(startDate))
            .count();
    }

    private int countWeeklyDaysWithReservations(List<ProfessionalBookingResponse> bookings) {
        Set<String> bookedDates = bookings.stream()
            .filter(booking -> !BookingOperationalStatus.CANCELLED.name().equalsIgnoreCase(booking.getStatus()))
            .map(this::parseStartDate)
            .filter(date -> date != null)
            .map(LocalDate::toString)
            .collect(Collectors.toSet());
        return bookedDates.size();
    }

    private int countScheduledDays(ProfesionalScheduleDto schedule, LocalDate weekStart, LocalDate weekEnd) {
        if (schedule == null || schedule.getDays() == null) {
            return 0;
        }

        int count = 0;
        for (LocalDate date = weekStart; !date.isAfter(weekEnd); date = date.plusDays(1)) {
            if (ProfessionalScheduleSupport.isDatePaused(date, schedule.getPauses())) {
                continue;
            }
            String dayKey = toDayKey(date.getDayOfWeek());
            ProfesionalScheduleDayDto day = schedule.getDays().stream()
                .filter(item -> item != null && dayKey.equalsIgnoreCase(item.getDay()))
                .findFirst()
                .orElse(null);
            if (day != null && day.isEnabled() && !day.isPaused()) {
                count++;
            }
        }
        return count;
    }

    private int countByStatus(List<ProfessionalBookingResponse> bookings, BookingOperationalStatus status) {
        return (int) bookings.stream()
            .filter(booking -> status.name().equalsIgnoreCase(booking.getStatus()))
            .count();
    }

    private String toDayKey(DayOfWeek dayOfWeek) {
        String dayKey = switch (dayOfWeek) {
            case MONDAY -> "mon";
            case TUESDAY -> "tue";
            case WEDNESDAY -> "wed";
            case THURSDAY -> "thu";
            case FRIDAY -> "fri";
            case SATURDAY -> "sat";
            case SUNDAY -> "sun";
        };
        return dayKey.toLowerCase(Locale.ROOT);
    }

    private LocalDate parseStartDate(ProfessionalBookingResponse booking) {
        if (booking == null || booking.getStartDateTime() == null || booking.getStartDateTime().isBlank()) {
            return null;
        }
        return LocalDateTime.parse(booking.getStartDateTime()).toLocalDate();
    }
}
