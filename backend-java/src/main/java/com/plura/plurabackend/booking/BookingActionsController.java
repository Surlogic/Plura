package com.plura.plurabackend.booking;

import com.plura.plurabackend.booking.dto.BookingActionsResponse;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/reservas", "/bookings"})
public class BookingActionsController {

    private final BookingActionsService bookingActionsService;

    public BookingActionsController(BookingActionsService bookingActionsService) {
        this.bookingActionsService = bookingActionsService;
    }

    @GetMapping("/{id}/actions")
    public BookingActionsResponse getActions(
        @PathVariable("id") Long bookingId,
        Authentication authentication
    ) {
        return bookingActionsService.getActions(bookingId, authentication);
    }
}
