package com.plura.plurabackend.config;

import java.lang.reflect.Method;
import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
public class AsyncConfig implements AsyncConfigurer {

    private static final Logger LOGGER = LoggerFactory.getLogger(AsyncConfig.class);

    @Value("${app.async.available-slot.core-pool-size:8}")
    private int availableSlotCorePoolSize;

    @Value("${app.async.available-slot.max-pool-size:24}")
    private int availableSlotMaxPoolSize;

    @Value("${app.async.available-slot.queue-capacity:2000}")
    private int availableSlotQueueCapacity;

    @Value("${app.async.image.core-pool-size:2}")
    private int imageCorePoolSize;

    @Value("${app.async.image.max-pool-size:4}")
    private int imageMaxPoolSize;

    @Value("${app.async.image.queue-capacity:300}")
    private int imageQueueCapacity;

    @Bean(name = "availableSlotExecutor")
    public Executor availableSlotExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setThreadNamePrefix("available-slot-");
        executor.setCorePoolSize(Math.max(2, availableSlotCorePoolSize));
        executor.setMaxPoolSize(Math.max(availableSlotCorePoolSize, availableSlotMaxPoolSize));
        executor.setQueueCapacity(Math.max(100, availableSlotQueueCapacity));
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }

    @Bean(name = "imageProcessingExecutor")
    public Executor imageProcessingExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setThreadNamePrefix("image-job-");
        executor.setCorePoolSize(Math.max(1, imageCorePoolSize));
        executor.setMaxPoolSize(Math.max(imageCorePoolSize, imageMaxPoolSize));
        executor.setQueueCapacity(Math.max(50, imageQueueCapacity));
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(45);
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }

    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return new LoggingAsyncUncaughtExceptionHandler();
    }

    private static final class LoggingAsyncUncaughtExceptionHandler implements AsyncUncaughtExceptionHandler {
        @Override
        public void handleUncaughtException(Throwable ex, Method method, Object... params) {
            LOGGER.error(
                "Unhandled async exception in {} with params {}",
                method == null ? "<unknown>" : method.toGenericString(),
                params,
                ex
            );
        }
    }
}
