package com.plura.plurabackend.core.storage.thumbnail;

public interface ImageThumbnailJobService {
    void generateThumbnailsAsync(String objectKey);
}
