package com.plura.plurabackend.core.availability;

import com.plura.plurabackend.config.DistributedLockService;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class AvailableSlotScheduler {

    private static final int LOCK_ID = 100_003;

    private final AvailableSlotAsyncDispatcher availableSlotAsyncDispatcher;
    private final DistributedLockService distributedLockService;
    private final int lookaheadDays;
    private final int slotRebuildShards;
    private final ZoneId appZoneId;
    private final boolean slotRebuildEnabled;

    public AvailableSlotScheduler(
        AvailableSlotAsyncDispatcher availableSlotAsyncDispatcher,
        DistributedLockService distributedLockService,
        @Value("${app.search.slot-rebuild-days:30}") int lookaheadDays,
        @Value("${app.search.slot-rebuild-shards:8}") int slotRebuildShards,
        @Value("${app.timezone:America/Montevideo}") String appTimezone,
        @Value("${feature.availability.slot-rebuild-enabled:true}") boolean slotRebuildEnabled
    ) {
        this.availableSlotAsyncDispatcher = availableSlotAsyncDispatcher;
        this.distributedLockService = distributedLockService;
        this.lookaheadDays = lookaheadDays;
        this.slotRebuildShards = slotRebuildShards;
        this.appZoneId = ZoneId.of(appTimezone);
        this.slotRebuildEnabled = slotRebuildEnabled;
    }

    @Scheduled(cron = "${app.search.slot-rebuild-cron:0 */30 2-6 * * *}")
    public void rebuildSlotsNightly() {
        if (!slotRebuildEnabled) {
            return;
        }
        distributedLockService.runWithLock(LOCK_ID, "slot-rebuild", this::doRebuild);
    }

    private void doRebuild() {
        int normalizedDays = Math.max(1, lookaheadDays);
        int normalizedShards = Math.max(1, slotRebuildShards);
        if (normalizedShards == 1) {
            availableSlotAsyncDispatcher.rebuildAllNextDays(normalizedDays);
            return;
        }
        ZonedDateTime now = ZonedDateTime.now(appZoneId);
        int halfHourIndex = (now.getHour() * 2) + (now.getMinute() >= 30 ? 1 : 0);
        int shardIndex = Math.floorMod(halfHourIndex, normalizedShards);
        availableSlotAsyncDispatcher.rebuildShardNextDays(normalizedDays, normalizedShards, shardIndex);
    }
}
