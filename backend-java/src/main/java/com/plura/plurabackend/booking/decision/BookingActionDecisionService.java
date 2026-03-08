package com.plura.plurabackend.booking.decision;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.booking.actions.BookingActionsEvaluation;
import com.plura.plurabackend.booking.dto.BookingActionDecisionResponse;
import com.plura.plurabackend.booking.decision.model.BookingActionDecision;
import com.plura.plurabackend.booking.decision.model.BookingActionType;
import com.plura.plurabackend.booking.decision.repository.BookingActionDecisionRepository;
import com.plura.plurabackend.booking.event.model.BookingActorType;
import com.plura.plurabackend.booking.model.Booking;
import com.plura.plurabackend.booking.model.BookingOperationalStatus;
import java.math.BigDecimal;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Service;

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

    private String resolveFinancialOutcomeCode(BookingActionsEvaluation evaluation) {
        if (evaluation.refundPreviewAmount() != null && evaluation.refundPreviewAmount().signum() > 0) {
            return "PENDING_REFUND_REVIEW";
        }
        if (evaluation.retainPreviewAmount() != null && evaluation.retainPreviewAmount().signum() > 0) {
            return "RETENTION_RECORDED";
        }
        return "NO_FINANCIAL_ACTION";
    }

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
