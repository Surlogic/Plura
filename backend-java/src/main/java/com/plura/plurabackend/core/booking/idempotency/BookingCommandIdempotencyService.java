package com.plura.plurabackend.core.booking.idempotency;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.booking.decision.model.BookingActionType;
import com.plura.plurabackend.core.booking.dto.BookingCommandResponse;
import com.plura.plurabackend.core.booking.event.model.BookingActorType;
import com.plura.plurabackend.core.booking.idempotency.model.BookingCommandIdempotencyRecord;
import com.plura.plurabackend.core.booking.idempotency.model.BookingCommandIdempotencyStatus;
import com.plura.plurabackend.core.booking.idempotency.repository.BookingCommandIdempotencyRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.function.Supplier;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BookingCommandIdempotencyService {

    private final BookingCommandIdempotencyRepository bookingCommandIdempotencyRepository;
    private final ObjectMapper objectMapper;

    public BookingCommandIdempotencyService(
        BookingCommandIdempotencyRepository bookingCommandIdempotencyRepository,
        ObjectMapper objectMapper
    ) {
        this.bookingCommandIdempotencyRepository = bookingCommandIdempotencyRepository;
        this.objectMapper = objectMapper;
    }

    public BookingCommandResponse execute(
        BookingActionType commandType,
        BookingActorType actorType,
        Long actorUserId,
        Long bookingId,
        String idempotencyKey,
        Object requestPayload,
        Supplier<BookingCommandResponse> command
    ) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return command.get();
        }

        String normalizedKey = idempotencyKey.trim();
        String requestHash = buildRequestHash(commandType, bookingId, requestPayload);

        BookingCommandIdempotencyRecord existing = bookingCommandIdempotencyRepository
            .findByActorTypeAndActorUserIdAndCommandTypeAndIdempotencyKey(
                actorType,
                actorUserId,
                commandType,
                normalizedKey
            ).orElse(null);
        if (existing != null) {
            validateRequestHash(existing, requestHash);
            if (existing.getStatus() == BookingCommandIdempotencyStatus.COMPLETED) {
                return readResponse(existing);
            }
            if (existing.getStatus() == BookingCommandIdempotencyStatus.IN_PROGRESS) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe un comando en progreso con esa Idempotency-Key");
            }
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "La operación anterior con la misma Idempotency-Key falló; reintentá con una nueva clave"
            );
        }

        CreateRecordResult createResult = createInProgressRecord(
            commandType,
            actorType,
            actorUserId,
            bookingId,
            normalizedKey,
            requestHash
        );
        BookingCommandIdempotencyRecord record = createResult.record();
        if (!createResult.created()) {
            validateRequestHash(record, requestHash);
            if (record.getStatus() == BookingCommandIdempotencyStatus.COMPLETED) {
                return readResponse(record);
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe un comando en progreso con esa Idempotency-Key");
        }

        try {
            BookingCommandResponse response = command.get();
            record.setStatus(BookingCommandIdempotencyStatus.COMPLETED);
            record.setResponseJson(writeJson(response));
            record.setErrorMessage(null);
            bookingCommandIdempotencyRepository.save(record);
            return response;
        } catch (RuntimeException exception) {
            record.setStatus(BookingCommandIdempotencyStatus.FAILED);
            record.setErrorMessage(truncateMessage(exception.getMessage()));
            bookingCommandIdempotencyRepository.save(record);
            throw exception;
        }
    }

    private CreateRecordResult createInProgressRecord(
        BookingActionType commandType,
        BookingActorType actorType,
        Long actorUserId,
        Long bookingId,
        String idempotencyKey,
        String requestHash
    ) {
        BookingCommandIdempotencyRecord record = new BookingCommandIdempotencyRecord();
        record.setCommandType(commandType);
        record.setActorType(actorType);
        record.setActorUserId(actorUserId);
        record.setBookingId(bookingId);
        record.setIdempotencyKey(idempotencyKey);
        record.setRequestHash(requestHash);
        record.setStatus(BookingCommandIdempotencyStatus.IN_PROGRESS);
        try {
            return new CreateRecordResult(bookingCommandIdempotencyRepository.saveAndFlush(record), true);
        } catch (DataIntegrityViolationException exception) {
            return new CreateRecordResult(bookingCommandIdempotencyRepository
                .findByActorTypeAndActorUserIdAndCommandTypeAndIdempotencyKey(
                    actorType,
                    actorUserId,
                    commandType,
                    idempotencyKey
                )
                .orElseThrow(() -> exception), false);
        }
    }

    private void validateRequestHash(BookingCommandIdempotencyRecord record, String requestHash) {
        if (record != null && !record.getRequestHash().equals(requestHash)) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "La misma Idempotency-Key no puede reutilizarse con un payload distinto"
            );
        }
    }

    private BookingCommandResponse readResponse(BookingCommandIdempotencyRecord record) {
        if (record.getResponseJson() == null || record.getResponseJson().isBlank()) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "La operación ya fue procesada, pero no quedó respuesta serializada"
            );
        }
        try {
            return objectMapper.readValue(record.getResponseJson(), BookingCommandResponse.class);
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "No se pudo reconstruir la respuesta idempotente"
            );
        }
    }

    private String buildRequestHash(BookingActionType commandType, Long bookingId, Object requestPayload) {
        try {
            String raw = commandType.name()
                + "|"
                + bookingId
                + "|"
                + (requestPayload == null ? "" : objectMapper.writeValueAsString(requestPayload));
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (JsonProcessingException | NoSuchAlgorithmException exception) {
            throw new IllegalStateException("No se pudo calcular requestHash para idempotencia", exception);
        }
    }

    private String writeJson(BookingCommandResponse response) {
        try {
            return objectMapper.writeValueAsString(response);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("No se pudo serializar la respuesta idempotente", exception);
        }
    }

    private String truncateMessage(String message) {
        if (message == null || message.isBlank()) {
            return null;
        }
        return message.length() <= 500 ? message : message.substring(0, 500);
    }

    private record CreateRecordResult(
        BookingCommandIdempotencyRecord record,
        boolean created
    ) {}
}
