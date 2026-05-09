package com.plura.plurabackend.core.booking.decision;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.booking.actions.BookingActionsEvaluation;
import com.plura.plurabackend.core.booking.dto.BookingActionDecisionResponse;
import com.plura.plurabackend.core.booking.decision.model.BookingActionDecision;
import com.plura.plurabackend.core.booking.decision.model.BookingActionType;
import com.plura.plurabackend.core.booking.decision.repository.BookingActionDecisionRepository;
import com.plura.plurabackend.core.booking.event.model.BookingActorType;
import com.plura.plurabackend.core.booking.model.Booking;
import com.plura.plurabackend.core.booking.model.BookingOperationalStatus;
import java.math.BigDecimal;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Service;

/**
 * BookingActionDecisionService es un servicio de negocio del modulo reservas / decisiones.
 * Responsabilidad: coordinar reglas de negocio, validaciones, persistencia e integraciones del caso de uso.
 * Colabora con: bookingActionDecisionRepository, objectMapper.
 * Foco funcional: reservas, servicios.
 */
@Service
public class BookingActionDecisionService {

    private final BookingActionDecisionRepository bookingActionDecisionRepository;
    private final ObjectMapper objectMapper;

    public BookingActionDecisionService(
        BookingActionDecisionRepository bookingActionDecisionRepository,
        ObjectMapper objectMapper
    ) {
        this.bookingActionDecisionRepository = bookingActionDecisionRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Registra record para auditoria, historial o notificaciones.
     */
    public BookingActionDecision record(
        Booking booking,
        BookingActionType actionType,
        BookingActorType actorType,
        Long actorUserId,
        BookingOperationalStatus statusBefore,
        BookingOperationalStatus statusAfter,
        BookingActionsEvaluation evaluation,
        Map<String, Object> extraSnapshot
    ) {
        BookingActionDecision decision = new BookingActionDecision();
        decision.setBooking(booking);
        decision.setActionType(actionType);
        decision.setActorType(actorType);
        decision.setActorUserId(actorUserId);
        decision.setStatusBefore(statusBefore);
        decision.setStatusAfter(statusAfter);
        decision.setRefundPreviewAmount(evaluation.refundPreviewAmount());
        decision.setRetainPreviewAmount(evaluation.retainPreviewAmount());
        decision.setCurrency(evaluation.currency());
        decision.setFinancialOutcomeCode(resolveFinancialOutcomeCode(evaluation));
        decision.setReasonCodesJson(writeJson(evaluation.reasonCodes().stream().map(Enum::name).toList()));
        decision.setMessageCode(evaluation.messageCode());
        decision.setMessageParamsJson(writeJson(evaluation.messageParams()));
        decision.setPlainTextFallback(evaluation.plainTextFallback());

        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("suggestedAction", evaluation.suggestedAction().name());
        snapshot.put("refundPreviewAmount", evaluation.refundPreviewAmount());
        snapshot.put("retainPreviewAmount", evaluation.retainPreviewAmount());
        snapshot.put("currency", evaluation.currency());
        snapshot.put("reasonCodes", evaluation.reasonCodes().stream().map(Enum::name).toList());
        snapshot.put("messageCode", evaluation.messageCode());
        snapshot.put("messageParams", evaluation.messageParams());
        snapshot.put("plainTextFallback", evaluation.plainTextFallback());
        if (extraSnapshot != null && !extraSnapshot.isEmpty()) {
            snapshot.putAll(extraSnapshot);
        }
        decision.setDecisionSnapshotJson(writeJson(snapshot));
        return bookingActionDecisionRepository.save(decision);
    }

    /**
     * Registra manual para auditoria, historial o notificaciones.
     */
    public BookingActionDecision recordManual(
        Booking booking,
        BookingActionType actionType,
        BookingActorType actorType,
        Long actorUserId,
        BookingOperationalStatus statusBefore,
        BookingOperationalStatus statusAfter,
        BigDecimal refundPreviewAmount,
        BigDecimal retainPreviewAmount,
        String currency,
        List<String> reasonCodes,
        String messageCode,
        Map<String, String> messageParams,
        String plainTextFallback,
        String financialOutcomeCode,
        Map<String, Object> extraSnapshot
    ) {
        BookingActionDecision decision = new BookingActionDecision();
        decision.setBooking(booking);
        decision.setActionType(actionType);
        decision.setActorType(actorType);
        decision.setActorUserId(actorUserId);
        decision.setStatusBefore(statusBefore);
        decision.setStatusAfter(statusAfter);
        decision.setRefundPreviewAmount(refundPreviewAmount);
        decision.setRetainPreviewAmount(retainPreviewAmount);
        decision.setCurrency(currency);
        decision.setFinancialOutcomeCode(financialOutcomeCode);
        decision.setReasonCodesJson(writeJson(reasonCodes));
        decision.setMessageCode(messageCode);
        decision.setMessageParamsJson(writeJson(messageParams));
        decision.setPlainTextFallback(plainTextFallback);

        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("refundPreviewAmount", refundPreviewAmount);
        snapshot.put("retainPreviewAmount", retainPreviewAmount);
        snapshot.put("currency", currency);
        snapshot.put("reasonCodes", reasonCodes);
        snapshot.put("messageCode", messageCode);
        snapshot.put("messageParams", messageParams);
        snapshot.put("plainTextFallback", plainTextFallback);
        if (extraSnapshot != null && !extraSnapshot.isEmpty()) {
            snapshot.putAll(extraSnapshot);
        }
        decision.setDecisionSnapshotJson(writeJson(snapshot));
        return bookingActionDecisionRepository.save(decision);
    }

    /**
     * Convierte datos internos al formato respuesta esperado por el consumidor.
     */
    public BookingActionDecisionResponse toResponse(BookingActionDecision decision) {
        if (decision == null) {
            return null;
        }
        return new BookingActionDecisionResponse(
            decision.getId(),
            decision.getActionType() == null ? null : decision.getActionType().name(),
            decision.getActorType() == null ? null : decision.getActorType().name(),
            decision.getStatusBefore() == null ? null : decision.getStatusBefore().name(),
            decision.getStatusAfter() == null ? null : decision.getStatusAfter().name(),
            decision.getRefundPreviewAmount(),
            decision.getRetainPreviewAmount(),
            decision.getCurrency(),
            decision.getFinancialOutcomeCode(),
            readStringList(decision.getReasonCodesJson()),
            decision.getMessageCode(),
            readStringMap(decision.getMessageParamsJson()),
            decision.getPlainTextFallback(),
            decision.getCreatedAt()
        );
    }

    /**
     * Resuelve financial outcome code normalizando entradas, defaults y casos borde.
     */
    private String resolveFinancialOutcomeCode(BookingActionsEvaluation evaluation) {
        if (evaluation.refundPreviewAmount() != null
            && evaluation.refundPreviewAmount().signum() > 0
            && evaluation.retainPreviewAmount() != null
            && evaluation.retainPreviewAmount().signum() > 0) {
            return "PARTIAL_REFUND_AND_RELEASE_PENDING";
        }
        if (evaluation.refundPreviewAmount() != null && evaluation.refundPreviewAmount().signum() > 0) {
            return "PENDING_REFUND_REVIEW";
        }
        if (evaluation.retainPreviewAmount() != null && evaluation.retainPreviewAmount().signum() > 0) {
            return "RETENTION_RECORDED";
        }
        return "NO_FINANCIAL_ACTION";
    }

    /**
     * Guarda json en el formato persistido esperado por el modulo.
     */
    private String writeJson(Object payload) {
        if (payload == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException exception) {
            return "{\"serializationError\":true}";
        }
    }

    /**
     * Lee string listado desde la fuente persistida y aplica defaults si faltan datos.
     */
    private List<String> readStringList(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException exception) {
            return List.of();
        }
    }

    /**
     * Lee string map desde la fuente persistida y aplica defaults si faltan datos.
     */
    private Map<String, String> readStringMap(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, String>>() {});
        } catch (JsonProcessingException exception) {
            return Map.of();
        }
    }
}
