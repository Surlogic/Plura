package com.plura.plurabackend.core.review.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpsertBusinessReplyRequest {

    @NotBlank
    @Size(max = 2000)
    private String text;
}
