package com.plura.plurabackend.auth.dto;

import lombok.Data;

@Data
public class DeleteAccountRequest {
    private String challengeId;
    private String code;
}
