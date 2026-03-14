package com.plura.plurabackend.billing.providerops.dto;

import java.util.List;

public record InternalProviderOperationAlertResponse(
    String code,
    boolean triggered,
    long count,
    long threshold,
    String message,
    List<InternalProviderOperationIssueResponse> samples
) {}
