package com.plura.plurabackend.professional.service.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import lombok.Data;

@Data
public class ProfesionalServiceRequest {
    @Size(max = 120)
    private String name;

    @Size(max = 200)
    private String description;

    @Positive
    private BigDecimal price;

    @Size(max = 40)
    private String duration;

    @Size(max = 500)
    @Pattern(regexp = "^(|https?://.+|/uploads/.+|r2://.+|r2:.+)$")
    private String imageUrl;

    @Min(0)
    @Max(120)
    private Integer postBufferMinutes;
    private Boolean active;
}
