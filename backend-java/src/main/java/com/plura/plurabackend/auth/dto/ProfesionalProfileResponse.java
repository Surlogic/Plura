package com.plura.plurabackend.auth.dto;

import com.plura.plurabackend.users.model.TipoCliente;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ProfesionalProfileResponse {
    private String id;
    private String slug;
    private String fullName;
    private String email;
    private String phoneNumber;
    private String rubro;
    private String location;
    private TipoCliente tipoCliente;
    private String publicHeadline;
    private String publicAbout;
    private List<String> publicPhotos;
    private LocalDateTime createdAt;
}
