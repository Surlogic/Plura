package com.plura.plurabackend.core.booking.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * BookingActionsResponse es un DTO de respuesta del modulo reservas / contratos DTO.
 * Responsabilidad: definir el contrato que la API devuelve al frontend u otro consumidor.
 * Contrato: lo consumen web/mobile, asi que renombrar campos puede romper compatibilidad.
 * Foco funcional: reservas.
 */
@Data
@AllArgsConstructor
public class BookingActionsResponse {
    private Long bookingId;
    private String actorType;
    private String operationalStatus;
    private String policySource;
    private BookingPolicySnapshotResponse policySnapshot;
    private boolean canCancel;
    private boolean canReschedule;
    private boolean canMarkNoShow;
    private boolean canComplete;
    private BigDecimal refundPreviewAmount;
    private BigDecimal retainPreviewAmount;
    private String currency;
    private String suggestedAction;
    private List<String> reasonCodes;
    private String messageCode;
    private Map<String, String> messageParams;
    private String plainTextFallback;
}
