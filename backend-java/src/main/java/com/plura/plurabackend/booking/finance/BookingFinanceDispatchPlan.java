package com.plura.plurabackend.booking.finance;

import java.util.List;

public record BookingFinanceDispatchPlan(
    BookingFinanceUpdateResult localResult,
    List<String> providerOperationIds
) {
    public boolean hasProviderOperations() {
        return providerOperationIds != null && !providerOperationIds.isEmpty();
    }
}
