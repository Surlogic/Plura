package com.plura.plurabackend.booking.policy;

public final class BookingPolicyDefaults {

    public static final boolean DEFAULT_ALLOW_CLIENT_CANCELLATION = true;
    public static final boolean DEFAULT_ALLOW_CLIENT_RESCHEDULE = true;
    public static final int DEFAULT_MAX_CLIENT_RESCHEDULES = 1;
    public static final boolean DEFAULT_RETAIN_DEPOSIT_ON_LATE_CANCELLATION = false;

    private BookingPolicyDefaults() {}

    public static int resolveMaxClientReschedules(Integer value) {
        return value == null ? DEFAULT_MAX_CLIENT_RESCHEDULES : value;
    }
}
