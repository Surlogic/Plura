package com.plura.plurabackend.professional.service.dto;

import com.plura.plurabackend.booking.model.ServicePaymentType;
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

    @Positive
    private BigDecimal depositAmount;

    @Size(max = 40)
    private String duration;

    @Size(max = 120)
    @Pattern(regexp = "^(|[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)$")
    private String categorySlug;

    @Size(max = 500)
    @Pattern(regexp = "^(|https?://.+|/uploads/.+|r2://.+|r2:.+)$")
    private String imageUrl;

    @Min(0)
    @Max(120)
    private Integer postBufferMinutes;

    private ServicePaymentType paymentType;

    @Size(max = 10)
    @Pattern(regexp = "^[A-Z]{3}$")
    private String currency;

    private Boolean active;
}
