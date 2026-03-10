package com.plura.plurabackend.professional;

import com.plura.plurabackend.booking.application.BookingCommandApplicationService;
import com.plura.plurabackend.booking.application.BookingQueryApplicationService;
import com.plura.plurabackend.booking.dto.BookingCancelRequest;
import com.plura.plurabackend.booking.dto.BookingCommandResponse;
import com.plura.plurabackend.booking.dto.BookingPolicyResponse;
import com.plura.plurabackend.booking.dto.BookingPolicyUpdateRequest;
import com.plura.plurabackend.booking.dto.BookingRescheduleRequest;
import com.plura.plurabackend.booking.dto.ProfessionalBookingCreateRequest;
import com.plura.plurabackend.booking.dto.ProfessionalBookingResponse;
import com.plura.plurabackend.booking.dto.ProfessionalBookingUpdateRequest;
import com.plura.plurabackend.booking.dto.PublicBookingRequest;
import com.plura.plurabackend.booking.dto.PublicBookingResponse;
import com.plura.plurabackend.professional.application.ProfileApplicationService;
import com.plura.plurabackend.professional.dto.ProfesionalBusinessProfileUpdateRequest;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageResponse;
import com.plura.plurabackend.professional.dto.ProfesionalPublicPageUpdateRequest;
import com.plura.plurabackend.professional.dto.ProfesionalPublicSummaryResponse;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import com.plura.plurabackend.professional.service.dto.ProfesionalServiceRequest;
import com.plura.plurabackend.professional.service.dto.ProfesionalServiceResponse;
import com.plura.plurabackend.scheduling.application.ScheduleApplicationService;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ProfessionalPublicPageCoreService {

    private final ProfileApplicationService profileApplicationService;
    private final ScheduleApplicationService scheduleApplicationService;
    private final BookingCommandApplicationService bookingCommandApplicationService;
    private final BookingQueryApplicationService bookingQueryApplicationService;

    @Autowired
    public ProfessionalPublicPageCoreService(
        ProfileApplicationService profileApplicationService,
        ScheduleApplicationService scheduleApplicationService,
        BookingCommandApplicationService bookingCommandApplicationService,
        BookingQueryApplicationService bookingQueryApplicationService
    ) {
        this.profileApplicationService = profileApplicationService;
        this.scheduleApplicationService = scheduleApplicationService;
        this.bookingCommandApplicationService = bookingCommandApplicationService;
        this.bookingQueryApplicationService = bookingQueryApplicationService;
    }

    public ProfesionalPublicPageResponse getPublicPageBySlug(String slug) {
        return profileApplicationService.getPublicPageBySlug(slug);
    }

    public List<String> getAvailableSlots(String slug, String rawDate, String serviceId) {
        return scheduleApplicationService.getAvailableSlots(slug, rawDate, serviceId);
    }

    public PublicBookingResponse createPublicBooking(
        String slug,
        PublicBookingRequest request,
        String rawUserId
    ) {
        return bookingCommandApplicationService.createPublicBooking(slug, request, rawUserId);
    }

    public List<ProfessionalBookingResponse> getProfessionalBookings(
        String rawUserId,
        String rawDate,
        String rawDateFrom,
        String rawDateTo
    ) {
        return bookingQueryApplicationService.getProfessionalBookings(rawUserId, rawDate, rawDateFrom, rawDateTo);
    }

    public ProfessionalBookingResponse createProfessionalBooking(
        String rawUserId,
        ProfessionalBookingCreateRequest request
    ) {
        return bookingCommandApplicationService.createProfessionalBooking(rawUserId, request);
    }

    public ProfessionalBookingResponse updateProfessionalBooking(
        String rawUserId,
        Long bookingId,
        ProfessionalBookingUpdateRequest request
    ) {
        return bookingCommandApplicationService.updateProfessionalBooking(rawUserId, bookingId, request);
    }

    public BookingCommandResponse cancelBookingAsClient(
        String rawUserId,
        Long bookingId,
        BookingCancelRequest request
    ) {
        return bookingCommandApplicationService.cancelBookingAsClient(rawUserId, bookingId, request);
    }

    public BookingCommandResponse cancelBookingAsProfessional(
        String rawUserId,
        Long bookingId,
        BookingCancelRequest request
    ) {
        return bookingCommandApplicationService.cancelBookingAsProfessional(rawUserId, bookingId, request);
    }

    public BookingCommandResponse rescheduleBookingAsClient(
        String rawUserId,
        Long bookingId,
        BookingRescheduleRequest request
    ) {
        return bookingCommandApplicationService.rescheduleBookingAsClient(rawUserId, bookingId, request);
    }

    public BookingCommandResponse rescheduleBookingAsProfessional(
        String rawUserId,
        Long bookingId,
        BookingRescheduleRequest request
    ) {
        return bookingCommandApplicationService.rescheduleBookingAsProfessional(rawUserId, bookingId, request);
    }

    public BookingCommandResponse markBookingNoShow(String rawUserId, Long bookingId) {
        return bookingCommandApplicationService.markBookingNoShow(rawUserId, bookingId);
    }

    public BookingCommandResponse completeBooking(String rawUserId, Long bookingId) {
        return bookingCommandApplicationService.completeBooking(rawUserId, bookingId);
    }

    public BookingCommandResponse retryBookingPayout(String rawUserId, Long bookingId) {
        return bookingCommandApplicationService.retryBookingPayout(rawUserId, bookingId);
    }

    public List<ProfesionalPublicSummaryResponse> listPublicProfessionals(
        Integer limit,
        Integer page,
        Integer size,
        UUID categoryId,
        String categorySlug
    ) {
        return profileApplicationService.listPublicProfessionals(limit, page, size, categoryId, categorySlug);
    }

    public ProfesionalPublicPageResponse getPublicPageByProfesionalId(String rawUserId) {
        return profileApplicationService.getPublicPageByProfesionalId(rawUserId);
    }

    public ProfesionalPublicPageResponse updatePublicPage(
        String rawUserId,
        ProfesionalPublicPageUpdateRequest request
    ) {
        return profileApplicationService.updatePublicPage(rawUserId, request);
    }

    public void updateBusinessProfile(String rawUserId, ProfesionalBusinessProfileUpdateRequest request) {
        profileApplicationService.updateBusinessProfile(rawUserId, request);
    }

    public ProfesionalScheduleDto getSchedule(String rawUserId) {
        return scheduleApplicationService.getSchedule(rawUserId);
    }

    public ProfesionalScheduleDto updateSchedule(String rawUserId, ProfesionalScheduleDto request) {
        return scheduleApplicationService.updateSchedule(rawUserId, request);
    }

    public BookingPolicyResponse getBookingPolicy(String rawUserId) {
        return profileApplicationService.getBookingPolicy(rawUserId);
    }

    public BookingPolicyResponse updateBookingPolicy(String rawUserId, BookingPolicyUpdateRequest request) {
        return profileApplicationService.updateBookingPolicy(rawUserId, request);
    }

    public List<ProfesionalServiceResponse> listServices(String rawUserId) {
        return profileApplicationService.listServices(rawUserId);
    }

    public ProfesionalServiceResponse createService(String rawUserId, ProfesionalServiceRequest request) {
        return profileApplicationService.createService(rawUserId, request);
    }

    public ProfesionalServiceResponse updateService(
        String rawUserId,
        String serviceId,
        ProfesionalServiceRequest request
    ) {
        return profileApplicationService.updateService(rawUserId, serviceId, request);
    }

    public void deleteService(String rawUserId, String serviceId) {
        profileApplicationService.deleteService(rawUserId, serviceId);
    }
}
