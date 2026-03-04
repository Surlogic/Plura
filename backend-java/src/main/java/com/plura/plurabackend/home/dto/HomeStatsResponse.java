package com.plura.plurabackend.home.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class HomeStatsResponse {
    private long activeUsers;
    private long professionals;
    private long categories;
    private long monthlyBookings;
}
