package com.plura.plurabackend.auth.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthSessionListResponse {
    private List<AuthSessionResponse> sessions;
}
