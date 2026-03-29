package com.plura.plurabackend.professional.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MediaPresentationDto {
    @DecimalMin("0.0")
    @DecimalMax("100.0")
    private Double positionX;

    @DecimalMin("0.0")
    @DecimalMax("100.0")
    private Double positionY;

    @DecimalMin("1.0")
    @DecimalMax("3.0")
    private Double zoom;
}
