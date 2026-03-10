package com.plura.plurabackend.booking.policy;

import com.plura.plurabackend.booking.policy.model.LateCancellationRefundMode;
import java.math.BigDecimal;

public final class BookingPolicyDefaults {

    public static final boolean DEFAULT_ALLOW_CLIENT_CANCELLATION = true;
    public static final boolean DEFAULT_ALLOW_CLIENT_RESCHEDULE = true;
    public static final int DEFAULT_MAX_CLIENT_RESCHEDULES = 1;
    public static final LateCancellationRefundMode DEFAULT_LATE_CANCELLATION_REFUND_MODE = LateCancellationRefundMode.FULL;
    public static final BigDecimal DEFAULT_LATE_CANCELLATION_REFUND_VALUE = BigDecimal.valueOf(100);

    private BookingPolicyDefaults() {}

    public static int resolveMaxClientReschedules(Integer value) {
        return value == null ? DEFAULT_MAX_CLIENT_RESCHEDULES : value;
    }
}
