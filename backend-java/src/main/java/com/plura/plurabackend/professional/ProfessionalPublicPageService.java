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
public class ProfessionalPublicPageService {

    private final BookingService bookingService;
    private final ScheduleService scheduleService;
    private final ProfessionalProfileService professionalProfileService;

    public ProfessionalPublicPageService(
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
        Integer page,
        Integer size,
        UUID categoryId,
        String categorySlug
    ) {
        return professionalProfileService.listPublicProfessionals(limit, page, size, categoryId, categorySlug);
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
