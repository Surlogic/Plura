package com.plura.plurabackend.usuario.favorite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.category.dto.CategoryResponse;
import com.plura.plurabackend.core.security.RoleGuard;
import com.plura.plurabackend.professional.dto.ProfesionalPublicSummaryResponse;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class ClientFavoriteControllerTest {

    private final ClientFavoriteService clientFavoriteService = mock(ClientFavoriteService.class);
    private final RoleGuard roleGuard = mock(RoleGuard.class);
    private final ClientFavoriteController controller = new ClientFavoriteController(clientFavoriteService, roleGuard);

    @Test
    void shouldListFavoritesForCurrentClient() {
        when(roleGuard.requireUser()).thenReturn(42L);
        List<ProfesionalPublicSummaryResponse> favorites = List.of(sampleFavorite());
        when(clientFavoriteService.listFavorites("42")).thenReturn(favorites);

        List<ProfesionalPublicSummaryResponse> response = controller.listFavorites();

        assertEquals(favorites, response);
        verify(clientFavoriteService).listFavorites("42");
    }

    @Test
    void shouldAddFavoriteForCurrentClient() {
        when(roleGuard.requireUser()).thenReturn(42L);
        ProfesionalPublicSummaryResponse favorite = sampleFavorite();
        when(clientFavoriteService.addFavorite("42", "ana-garcia")).thenReturn(favorite);

        ResponseEntity<ProfesionalPublicSummaryResponse> response = controller.addFavorite("ana-garcia");

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertEquals(favorite, response.getBody());
        verify(clientFavoriteService).addFavorite("42", "ana-garcia");
    }

    @Test
    void shouldRemoveFavoriteForCurrentClient() {
        when(roleGuard.requireUser()).thenReturn(42L);

        ResponseEntity<Void> response = controller.removeFavorite("ana-garcia");

        assertEquals(HttpStatus.NO_CONTENT, response.getStatusCode());
        verify(clientFavoriteService).removeFavorite("42", "ana-garcia");
    }

    private ProfesionalPublicSummaryResponse sampleFavorite() {
        return new ProfesionalPublicSummaryResponse(
            "17",
            "ana-garcia",
            "Ana Garcia",
            "Peluqueria",
            "Montevideo",
            "Color y corte",
            List.of(new CategoryResponse(UUID.randomUUID(), "Cabello", "cabello", null, 1)),
            "https://cdn.plura.test/ana.jpg",
            4.5,
            12
        );
    }
}
