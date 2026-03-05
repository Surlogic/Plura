package com.plura.plurabackend.search;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.cache.SearchCacheService;
import com.plura.plurabackend.search.dto.SearchItemResponse;
import com.plura.plurabackend.search.dto.SearchResponse;
import com.plura.plurabackend.search.engine.SearchEngineClient;
import com.plura.plurabackend.storage.ImageStorageService;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class SearchServiceTest {

    @Test
    void shouldFallbackToSqlWhenSearchEngineFails() {
        SearchNativeRepository repository = Mockito.mock(SearchNativeRepository.class);
        SearchCacheService cacheService = Mockito.mock(SearchCacheService.class);
        SearchEngineClient engineClient = Mockito.mock(SearchEngineClient.class);
        ImageStorageService imageStorageService = Mockito.mock(ImageStorageService.class);

        when(cacheService.getSearch(anyString())).thenReturn(Optional.empty());
        when(imageStorageService.resolvePublicUrl(anyString())).thenReturn("https://cdn.example/profiles/photo.jpg");
        when(repository.search(any(), anyBoolean(), anyString(), anyBoolean()))
            .thenReturn(new SearchNativeRepository.SearchPageResult(
                1L,
                List.of(new SearchItemResponse(
                    "1",
                    "pro-uno",
                    "Pro Uno",
                    "Headline",
                    4.8,
                    10,
                    List.of("cabello"),
                    null,
                    -34.9,
                    -56.1,
                    1500d,
                    "r2://bucket/profiles/photo.jpg",
                    "Montevideo"
                )),
                false
            ));
        when(engineClient.search(any())).thenThrow(new IllegalStateException("Meili down"));

        SearchService service = new SearchService(
            repository,
            cacheService,
            new SimpleMeterRegistry(),
            Optional.of(engineClient),
            imageStorageService,
            false,
            "AVAILABLE_SLOT",
            false,
            true,
            false,
            true
        );

        SearchResponse response = service.search(
            "barber",
            "SERVICIO",
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            false,
            0,
            10,
            "RELEVANCE"
        );

        assertEquals(1L, response.getTotal());
        assertEquals(1, response.getItems().size());
        assertEquals("https://cdn.example/profiles/photo.jpg", response.getItems().get(0).getCoverImageUrl());
        verify(repository).search(any(), anyBoolean(), anyString(), anyBoolean());
    }
}
