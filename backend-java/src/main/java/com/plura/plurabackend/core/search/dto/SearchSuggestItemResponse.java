package com.plura.plurabackend.core.search.dto;

import lombok.Data;

@Data
public class SearchSuggestItemResponse {
    private String id;
    private String name;
    private String displayName;
    private String professionalName;
    private String businessName;
    private String serviceName;

    public SearchSuggestItemResponse(
        String id,
        String name,
        String displayName,
        String professionalName,
        String businessName,
        String serviceName
    ) {
        this.id = id;
        this.name = name;
        this.displayName = displayName;
        this.professionalName = professionalName;
        this.businessName = businessName;
        this.serviceName = serviceName;
    }

    public SearchSuggestItemResponse(String id, String name) {
        this(id, name, name, null, null, null);
    }

    public static SearchSuggestItemResponse professional(String id, String professionalName) {
        return new SearchSuggestItemResponse(
            id,
            professionalName,
            professionalName,
            professionalName,
            null,
            null
        );
    }

    public static SearchSuggestItemResponse local(String id, String businessName) {
        return new SearchSuggestItemResponse(
            id,
            businessName,
            businessName,
            null,
            businessName,
            null
        );
    }

    public static SearchSuggestItemResponse service(String id, String serviceName) {
        return new SearchSuggestItemResponse(
            id,
            serviceName,
            serviceName,
            null,
            null,
            serviceName
        );
    }
}
