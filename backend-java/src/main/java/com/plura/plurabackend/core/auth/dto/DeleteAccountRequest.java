package com.plura.plurabackend.core.auth.dto;

import lombok.Data;

@Data
public class DeleteAccountRequest {
    private String challengeId;
    private String code;
}
