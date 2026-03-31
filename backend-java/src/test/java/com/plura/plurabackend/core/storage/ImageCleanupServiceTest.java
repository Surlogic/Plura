package com.plura.plurabackend.core.storage;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.anyString;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ImageCleanupServiceTest {

    private ImageStorageService imageStorageService;
    private ImageCleanupService cleanupService;

    @BeforeEach
    void setUp() {
        imageStorageService = mock(ImageStorageService.class);
        when(imageStorageService.normalizeStoredReference(anyString())).thenAnswer(invocation -> invocation.getArgument(0));
        cleanupService = new ImageCleanupService(imageStorageService);
    }

    // --- deleteIfChanged ---

    @Test
    void deleteIfChanged_deletesOldWhenUrlChanges() {
        when(imageStorageService.deleteImage("r2://plura-images/professionals/1/logos/old.jpg")).thenReturn(true);
        cleanupService.deleteIfChanged(
            "r2://plura-images/professionals/1/logos/old.jpg",
            "r2://plura-images/professionals/1/logos/new.jpg"
        );
        verify(imageStorageService).deleteImage("r2://plura-images/professionals/1/logos/old.jpg");
    }

    @Test
    void deleteIfChanged_doesNotDeleteWhenUrlIsSame() {
        cleanupService.deleteIfChanged(
            "r2://plura-images/professionals/1/logos/same.jpg",
            "r2://plura-images/professionals/1/logos/same.jpg"
        );
        verify(imageStorageService, never()).deleteImage(anyString());
    }

    @Test
    void deleteIfChanged_deletesOldWhenNewIsNull() {
        when(imageStorageService.deleteImage("/uploads/professionals/1/logos/old.jpg")).thenReturn(true);
        cleanupService.deleteIfChanged("/uploads/professionals/1/logos/old.jpg", null);
        verify(imageStorageService).deleteImage("/uploads/professionals/1/logos/old.jpg");
    }

    @Test
    void deleteIfChanged_deletesOldWhenNewIsBlank() {
        when(imageStorageService.deleteImage("/uploads/professionals/1/logos/old.jpg")).thenReturn(true);
        cleanupService.deleteIfChanged("/uploads/professionals/1/logos/old.jpg", "  ");
        verify(imageStorageService).deleteImage("/uploads/professionals/1/logos/old.jpg");
    }

    @Test
    void deleteIfChanged_doesNothingWhenOldIsNull() {
        cleanupService.deleteIfChanged(null, "r2://bucket/new.jpg");
        verify(imageStorageService, never()).deleteImage(anyString());
    }

    @Test
    void deleteIfChanged_doesNothingWhenOldIsBlank() {
        cleanupService.deleteIfChanged("", "r2://bucket/new.jpg");
        verify(imageStorageService, never()).deleteImage(anyString());
    }

    @Test
    void deleteIfChanged_ignoresExternalHttpUrl() {
        cleanupService.deleteIfChanged("https://external-cdn.com/image.jpg", "r2://bucket/new.jpg");
        verify(imageStorageService, never()).deleteImage(anyString());
    }

    // --- deleteIfRemoved ---

    @Test
    void deleteIfRemoved_deletesManaged() {
        when(imageStorageService.deleteImage("r2://plura-images/services/uuid.jpg")).thenReturn(true);
        cleanupService.deleteIfRemoved("r2://plura-images/services/uuid.jpg");
        verify(imageStorageService).deleteImage("r2://plura-images/services/uuid.jpg");
    }

    @Test
    void deleteIfRemoved_ignoresNull() {
        cleanupService.deleteIfRemoved(null);
        verify(imageStorageService, never()).deleteImage(anyString());
    }

    @Test
    void deleteIfRemoved_ignoresExternal() {
        cleanupService.deleteIfRemoved("https://cdn.example.com/photo.jpg");
        verify(imageStorageService, never()).deleteImage(anyString());
    }

    @Test
    void deleteIfRemoved_handlesLocalUploadsPath() {
        when(imageStorageService.deleteImage("/uploads/professionals/1/gallery/uuid.jpg")).thenReturn(true);
        cleanupService.deleteIfRemoved("/uploads/professionals/1/gallery/uuid.jpg");
        verify(imageStorageService).deleteImage("/uploads/professionals/1/gallery/uuid.jpg");
    }

    // --- deleteRemovedFromList (gallery) ---

    @Test
    void deleteRemovedFromList_deletesRemovedPhotos() {
        List<String> oldPhotos = List.of(
            "r2://bucket/professionals/1/gallery/a.jpg",
            "r2://bucket/professionals/1/gallery/b.jpg",
            "r2://bucket/professionals/1/gallery/c.jpg"
        );
        List<String> newPhotos = List.of(
            "r2://bucket/professionals/1/gallery/a.jpg",
            "r2://bucket/professionals/1/gallery/c.jpg"
        );
        when(imageStorageService.deleteImage(anyString())).thenReturn(true);
        cleanupService.deleteRemovedFromList(oldPhotos, newPhotos);
        verify(imageStorageService).deleteImage("r2://bucket/professionals/1/gallery/b.jpg");
        verify(imageStorageService, never()).deleteImage("r2://bucket/professionals/1/gallery/a.jpg");
        verify(imageStorageService, never()).deleteImage("r2://bucket/professionals/1/gallery/c.jpg");
    }

    @Test
    void deleteRemovedFromList_doesNothingOnReorder() {
        List<String> oldPhotos = List.of("r2://a.jpg", "r2://b.jpg", "r2://c.jpg");
        List<String> newPhotos = List.of("r2://c.jpg", "r2://a.jpg", "r2://b.jpg");
        cleanupService.deleteRemovedFromList(oldPhotos, newPhotos);
        verify(imageStorageService, never()).deleteImage(anyString());
    }

    @Test
    void deleteRemovedFromList_deletesAllWhenNewIsEmpty() {
        List<String> oldPhotos = List.of(
            "r2://bucket/professionals/1/gallery/a.jpg",
            "r2://bucket/professionals/1/gallery/b.jpg"
        );
        when(imageStorageService.deleteImage(anyString())).thenReturn(true);
        cleanupService.deleteRemovedFromList(oldPhotos, List.of());
        verify(imageStorageService).deleteImage("r2://bucket/professionals/1/gallery/a.jpg");
        verify(imageStorageService).deleteImage("r2://bucket/professionals/1/gallery/b.jpg");
    }

    @Test
    void deleteRemovedFromList_deletesAllWhenNewIsNull() {
        List<String> oldPhotos = List.of("r2://bucket/photo.jpg");
        when(imageStorageService.deleteImage(anyString())).thenReturn(true);
        cleanupService.deleteRemovedFromList(oldPhotos, null);
        verify(imageStorageService).deleteImage("r2://bucket/photo.jpg");
    }

    @Test
    void deleteRemovedFromList_doesNothingWhenOldIsEmpty() {
        cleanupService.deleteRemovedFromList(List.of(), List.of("r2://new.jpg"));
        verifyNoInteractions(imageStorageService);
    }

    @Test
    void deleteRemovedFromList_doesNothingWhenOldIsNull() {
        cleanupService.deleteRemovedFromList(null, List.of("r2://new.jpg"));
        verifyNoInteractions(imageStorageService);
    }

    @Test
    void deleteRemovedFromList_skipsExternalUrlsInOldList() {
        List<String> oldPhotos = List.of(
            "https://external.com/photo.jpg",
            "r2://bucket/managed.jpg"
        );
        List<String> newPhotos = List.of();
        when(imageStorageService.deleteImage(anyString())).thenReturn(true);
        cleanupService.deleteRemovedFromList(oldPhotos, newPhotos);
        verify(imageStorageService).deleteImage("r2://bucket/managed.jpg");
        verify(imageStorageService, never()).deleteImage("https://external.com/photo.jpg");
    }

    // --- isManagedImage coverage ---

    @Test
    void deleteIfRemoved_handlesR2ColonPrefix() {
        when(imageStorageService.deleteImage("r2:professionals/1/services/uuid.jpg")).thenReturn(true);
        cleanupService.deleteIfRemoved("r2:professionals/1/services/uuid.jpg");
        verify(imageStorageService).deleteImage("r2:professionals/1/services/uuid.jpg");
    }

    @Test
    void deleteIfRemoved_handlesBareKey() {
        when(imageStorageService.deleteImage("professionals/1/logos/uuid.jpg")).thenReturn(true);
        cleanupService.deleteIfRemoved("professionals/1/logos/uuid.jpg");
        verify(imageStorageService).deleteImage("professionals/1/logos/uuid.jpg");
    }

    @Test
    void deleteIfRemoved_handlesBareServicesKey() {
        when(imageStorageService.deleteImage("services/uuid.jpg")).thenReturn(true);
        cleanupService.deleteIfRemoved("services/uuid.jpg");
        verify(imageStorageService).deleteImage("services/uuid.jpg");
    }

    @Test
    void deleteIfRemoved_handlesManagedPublicUrlAfterCanonicalization() {
        when(imageStorageService.normalizeStoredReference("https://img.surlogicuy.com/professionals/1/gallery/uuid.jpg"))
            .thenReturn("r2://plura-images/professionals/1/gallery/uuid.jpg");
        when(imageStorageService.deleteImage("r2://plura-images/professionals/1/gallery/uuid.jpg")).thenReturn(true);

        cleanupService.deleteIfRemoved("https://img.surlogicuy.com/professionals/1/gallery/uuid.jpg");

        verify(imageStorageService).deleteImage("r2://plura-images/professionals/1/gallery/uuid.jpg");
    }

    // --- resilience ---

    @Test
    void deleteIfChanged_doesNotThrowWhenDeleteFails() {
        when(imageStorageService.deleteImage(anyString())).thenThrow(new RuntimeException("storage down"));
        cleanupService.deleteIfChanged("r2://bucket/old.jpg", "r2://bucket/new.jpg");
        // should not throw
    }

    @Test
    void deleteIfRemoved_doesNotThrowWhenDeleteFails() {
        when(imageStorageService.deleteImage(anyString())).thenThrow(new RuntimeException("storage down"));
        cleanupService.deleteIfRemoved("r2://bucket/old.jpg");
        // should not throw
    }
}
