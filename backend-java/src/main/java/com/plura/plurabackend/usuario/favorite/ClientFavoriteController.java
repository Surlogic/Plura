package com.plura.plurabackend.usuario.favorite;

import com.plura.plurabackend.core.security.RoleGuard;
import com.plura.plurabackend.professional.dto.ProfesionalPublicSummaryResponse;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * ClientFavoriteController es un controlador REST del modulo cliente / favoritos.
 * Responsabilidad: recibir requests HTTP, validar acceso basico y delegar la operacion al servicio de aplicacion o dominio.
 * Superficie HTTP: atiende rutas bajo /cliente/favoritos y deja la logica pesada en servicios.
 * Foco funcional: favoritos, clientes.
 */
@RestController
@RequestMapping("/cliente/favoritos")
public class ClientFavoriteController {

    private final ClientFavoriteService clientFavoriteService;
    private final RoleGuard roleGuard;

    public ClientFavoriteController(ClientFavoriteService clientFavoriteService, RoleGuard roleGuard) {
        this.clientFavoriteService = clientFavoriteService;
        this.roleGuard = roleGuard;
    }

    /**
     * Devuelve el listado de favoritos aplicando permisos y filtros del caso de uso.
     */
    @GetMapping
    public List<ProfesionalPublicSummaryResponse> listFavorites() {
        return clientFavoriteService.listFavorites(getClienteId());
    }

    /**
     * Agrega favorito validando que no duplique ni rompa reglas del dominio.
     */
    @PostMapping("/{slug}")
    public ResponseEntity<ProfesionalPublicSummaryResponse> addFavorite(
        @PathVariable String slug
    ) {
        ProfesionalPublicSummaryResponse response = clientFavoriteService.addFavorite(
            getClienteId(),
            slug
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Quita favorito y deja persistido el cambio de estado.
     */
    @DeleteMapping("/{slug}")
    public ResponseEntity<Void> removeFavorite(@PathVariable String slug) {
        clientFavoriteService.removeFavorite(getClienteId(), slug);
        return ResponseEntity.noContent().build();
    }

    private String getClienteId() {
        return String.valueOf(roleGuard.requireUser());
    }
}
