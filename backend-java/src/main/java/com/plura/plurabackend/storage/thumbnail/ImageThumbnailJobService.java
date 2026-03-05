package com.plura.plurabackend.storage.thumbnail;

public interface ImageThumbnailJobService {
    void generateThumbnailsAsync(String objectKey);
}
