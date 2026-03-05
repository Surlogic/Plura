package com.plura.plurabackend.professional;

import com.plura.plurabackend.booking.dto.ProfessionalBookingResponse;
import com.plura.plurabackend.booking.dto.ProfessionalBookingCreateRequest;
import com.plura.plurabackend.booking.dto.ProfessionalBookingUpdateRequest;
import com.plura.plurabackend.booking.dto.PublicBookingRequest;
import com.plura.plurabackend.booking.dto.PublicBookingResponse;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class BookingService {

    private final ProfessionalPublicPageCoreService coreService;

    public BookingService(ProfessionalPublicPageCoreService coreService) {
        this.coreService = coreService;
    }

    public PublicBookingResponse createPublicBooking(String slug, PublicBookingRequest request, String rawUserId) {
        return coreService.createPublicBooking(slug, request, rawUserId);
    }

    public List<ProfessionalBookingResponse> getProfessionalBookings(
        String rawUserId,
        String rawDate,
        String rawDateFrom,
        String rawDateTo
    ) {
        return coreService.getProfessionalBookings(rawUserId, rawDate, rawDateFrom, rawDateTo);
    }

    public ProfessionalBookingResponse createProfessionalBooking(
        String rawUserId,
        ProfessionalBookingCreateRequest request
    ) {
        return coreService.createProfessionalBooking(rawUserId, request);
    }

    public ProfessionalBookingResponse updateProfessionalBooking(
        String rawUserId,
        Long bookingId,
        ProfessionalBookingUpdateRequest request
    ) {
        return coreService.updateProfessionalBooking(rawUserId, bookingId, request);
    }
}
