package com.plura.plurabackend.professional.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Data;

@Data
public class ProfesionalPublicPageUpdateRequest {
    @Size(max = 160)
    private String headline;

    @Size(max = 3000)
    private String about;

    @Size(max = 10)
    private List<@Pattern(regexp = "^(https?://.+|r2://.+|r2:.+)$") String> photos;
}
