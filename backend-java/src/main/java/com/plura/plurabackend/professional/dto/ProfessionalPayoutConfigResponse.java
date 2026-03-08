package com.plura.plurabackend.professional.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProfessionalPayoutConfigResponse {
    private String status;
    private boolean readyToReceivePayouts;
    private boolean payoutEnabled;
    private String firstName;
    private String lastName;
    private String country;
    private String documentType;
    private String documentNumber;
    private String email;
    private String phone;
    private String bank;
    private String accountNumber;
    private String accountType;
    private String branch;
    private List<String> requiredFields;
    private List<String> missingFields;
    private List<String> invalidFields;
    private boolean hasOutstandingPaidBookings;
    private long outstandingPaidBookingsCount;
}
