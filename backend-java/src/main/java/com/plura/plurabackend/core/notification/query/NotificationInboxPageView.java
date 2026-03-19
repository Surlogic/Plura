package com.plura.plurabackend.core.notification.query;

import java.util.List;

public record NotificationInboxPageView(
    int page,
    int size,
    long total,
    List<NotificationInboxItemView> items
) {}
