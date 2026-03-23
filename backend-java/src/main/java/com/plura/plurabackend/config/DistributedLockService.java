package com.plura.plurabackend.config;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Lightweight distributed locking using PostgreSQL advisory locks.
 * No extra tables or dependencies needed — works across multiple app instances
 * as long as they share the same database.
 *
 * Usage: wrap scheduled task body with {@code runWithLock(lockId, runnable)}.
 * The lock is held only for the duration of the runnable and released immediately.
 * If another instance already holds the lock, the runnable is skipped.
 */
@Service
public class DistributedLockService {

    private static final Logger LOGGER = LoggerFactory.getLogger(DistributedLockService.class);

    private final DataSource dataSource;

    public DistributedLockService(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    /**
     * Tries to acquire a PostgreSQL advisory lock (session-scoped, non-blocking).
     * If acquired, runs the task and releases the lock. If not, skips silently.
     *
     * @param lockId unique integer identifying this scheduled task
     * @param taskName human-readable name for logging
     * @param task the work to execute under the lock
     */
    public void runWithLock(int lockId, String taskName, Runnable task) {
        try (Connection connection = dataSource.getConnection()) {
            boolean acquired = tryAcquire(connection, lockId);
            if (!acquired) {
                LOGGER.debug("Skipping {} — lock {} held by another instance", taskName, lockId);
                return;
            }
            try {
                task.run();
            } finally {
                release(connection, lockId);
            }
        } catch (Exception e) {
            LOGGER.warn("Error running locked task {} (lockId={}): {}", taskName, lockId, e.getMessage());
        }
    }

    private boolean tryAcquire(Connection connection, int lockId) throws Exception {
        try (PreparedStatement ps = connection.prepareStatement("SELECT pg_try_advisory_lock(?)")) {
            ps.setInt(1, lockId);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() && rs.getBoolean(1);
            }
        }
    }

    private void release(Connection connection, int lockId) {
        try (PreparedStatement ps = connection.prepareStatement("SELECT pg_advisory_unlock(?)")) {
            ps.setInt(1, lockId);
            ps.executeQuery();
        } catch (Exception e) {
            LOGGER.warn("Failed to release advisory lock {}: {}", lockId, e.getMessage());
        }
    }
}
