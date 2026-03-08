package com.plura.plurabackend.professional.service.dto;

import com.plura.plurabackend.booking.model.ServicePaymentType;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ProfesionalServiceResponse {
    private String id;
    private String name;
    private String description;
    private String price;
    private BigDecimal depositAmount;
    private String currency;
    private String duration;
    private String imageUrl;
    private Integer postBufferMinutes;
    private ServicePaymentType paymentType;
    private Boolean active;
}
