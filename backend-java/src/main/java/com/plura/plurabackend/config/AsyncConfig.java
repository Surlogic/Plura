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

    @Value("${app.async.geocoding.core-pool-size:2}")
    private int geocodingCorePoolSize;

    @Value("${app.async.geocoding.max-pool-size:4}")
    private int geocodingMaxPoolSize;

    @Value("${app.async.geocoding.queue-capacity:500}")
    private int geocodingQueueCapacity;

    @Value("${app.async.billing-webhook.core-pool-size:2}")
    private int billingWebhookCorePoolSize;

    @Value("${app.async.billing-webhook.max-pool-size:8}")
    private int billingWebhookMaxPoolSize;

    @Value("${app.async.billing-webhook.queue-capacity:500}")
    private int billingWebhookQueueCapacity;

    @Value("${app.async.billing-provider-operation.core-pool-size:2}")
    private int billingProviderOperationCorePoolSize;

    @Value("${app.async.billing-provider-operation.max-pool-size:8}")
    private int billingProviderOperationMaxPoolSize;

    @Value("${app.async.billing-provider-operation.queue-capacity:500}")
    private int billingProviderOperationQueueCapacity;

    @Value("${app.async.notification-email.core-pool-size:2}")
    private int notificationEmailCorePoolSize;

    @Value("${app.async.notification-email.max-pool-size:6}")
    private int notificationEmailMaxPoolSize;

    @Value("${app.async.notification-email.queue-capacity:500}")
    private int notificationEmailQueueCapacity;

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

    @Bean(name = "geocodingExecutor")
    public Executor geocodingExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setThreadNamePrefix("geocoding-");
        executor.setCorePoolSize(Math.max(1, geocodingCorePoolSize));
        executor.setMaxPoolSize(Math.max(geocodingCorePoolSize, geocodingMaxPoolSize));
        executor.setQueueCapacity(Math.max(100, geocodingQueueCapacity));
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(45);
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }

    @Bean(name = "billingWebhookExecutor")
    public Executor billingWebhookExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setThreadNamePrefix("billing-webhook-");
        executor.setCorePoolSize(Math.max(1, billingWebhookCorePoolSize));
        executor.setMaxPoolSize(Math.max(billingWebhookCorePoolSize, billingWebhookMaxPoolSize));
        executor.setQueueCapacity(Math.max(100, billingWebhookQueueCapacity));
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(45);
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }

    @Bean(name = "billingProviderOperationExecutor")
    public Executor billingProviderOperationExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setThreadNamePrefix("billing-provider-op-");
        executor.setCorePoolSize(Math.max(1, billingProviderOperationCorePoolSize));
        executor.setMaxPoolSize(Math.max(billingProviderOperationCorePoolSize, billingProviderOperationMaxPoolSize));
        executor.setQueueCapacity(Math.max(100, billingProviderOperationQueueCapacity));
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(45);
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }

    @Bean(name = "notificationEmailExecutor")
    public Executor notificationEmailExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setThreadNamePrefix("notification-email-");
        executor.setCorePoolSize(Math.max(1, notificationEmailCorePoolSize));
        executor.setMaxPoolSize(Math.max(notificationEmailCorePoolSize, notificationEmailMaxPoolSize));
        executor.setQueueCapacity(Math.max(100, notificationEmailQueueCapacity));
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
