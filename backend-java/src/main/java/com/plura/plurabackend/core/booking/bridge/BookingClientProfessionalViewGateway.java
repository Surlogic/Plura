package com.plura.plurabackend.core.booking.bridge;

import com.plura.plurabackend.core.booking.model.Booking;

public interface BookingClientProfessionalViewGateway {

    BookingClientProfessionalView resolveView(Booking booking);
}
