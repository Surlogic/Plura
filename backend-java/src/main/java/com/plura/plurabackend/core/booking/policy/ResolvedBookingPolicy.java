package com.plura.plurabackend.core.booking.policy;

public record ResolvedBookingPolicy(
    BookingPolicySnapshot snapshot,
    PolicySnapshotSource source
) {
    public enum PolicySnapshotSource {
        SNAPSHOT,
        LIVE_FALLBACK
    }
}
