package com.plura.plurabackend.core.booking.event;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.booking.event.model.BookingActorType;
import com.plura.plurabackend.core.booking.event.model.BookingEvent;
import com.plura.plurabackend.core.booking.event.model.BookingEventType;
import com.plura.plurabackend.core.booking.event.repository.BookingEventRepository;
import com.plura.plurabackend.core.booking.model.Booking;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class BookingEventService {

    private final BookingEventRepository bookingEventRepository;
    private final ObjectMapper objectMapper;

    public BookingEventService(
        BookingEventRepository bookingEventRepository,
        ObjectMapper objectMapper
    ) {
        this.bookingEventRepository = bookingEventRepository;
        this.objectMapper = objectMapper;
    }

    public void record(
        Booking booking,
        BookingEventType eventType,
        BookingActorType actorType,
        Long actorUserId,
        Map<String, Object> payload
    ) {
        if (booking == null || booking.getId() == null || eventType == null || actorType == null) {
            return;
        }

        BookingEvent event = new BookingEvent();
        event.setBooking(booking);
        event.setEventType(eventType);
        event.setActorType(actorType);
        event.setActorUserId(actorUserId);
        event.setPayloadJson(serializePayload(payload));
        bookingEventRepository.save(event);
    }

    private String serializePayload(Map<String, Object> payload) {
        if (payload == null || payload.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException exception) {
            return "{\"serializationError\":true}";
        }
    }
}
