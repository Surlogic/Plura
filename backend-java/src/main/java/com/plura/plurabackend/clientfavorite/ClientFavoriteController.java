package com.plura.plurabackend.clientfavorite;

import com.plura.plurabackend.professional.dto.ProfesionalPublicSummaryResponse;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/cliente/favoritos")
public class ClientFavoriteController {

    private final ClientFavoriteService clientFavoriteService;

    public ClientFavoriteController(ClientFavoriteService clientFavoriteService) {
        this.clientFavoriteService = clientFavoriteService;
    }

    @GetMapping
    public List<ProfesionalPublicSummaryResponse> listFavorites(Authentication authentication) {
        return clientFavoriteService.listFavorites(getClienteId(authentication));
    }

    @PostMapping("/{slug}")
    public ResponseEntity<ProfesionalPublicSummaryResponse> addFavorite(
        Authentication authentication,
        @PathVariable String slug
    ) {
        ProfesionalPublicSummaryResponse response = clientFavoriteService.addFavorite(
            getClienteId(authentication),
            slug
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/{slug}")
    public ResponseEntity<Void> removeFavorite(Authentication authentication, @PathVariable String slug) {
        clientFavoriteService.removeFavorite(getClienteId(authentication), slug);
        return ResponseEntity.noContent().build();
    }

    private String getClienteId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No autenticado");
        }

        boolean isCliente = authentication.getAuthorities().stream()
            .anyMatch(auth -> "ROLE_USER".equals(auth.getAuthority()));
        if (!isCliente) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo clientes");
        }

        return authentication.getPrincipal().toString();
    }
}
