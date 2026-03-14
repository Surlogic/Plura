package com.plura.plurabackend.core.search.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SearchSuggestResponse {
    private List<SearchSuggestCategoryResponse> categories;
    private List<SearchSuggestItemResponse> services;
    private List<SearchSuggestItemResponse> professionals;
    private List<SearchSuggestItemResponse> locals;
    private List<SearchSuggestItemResponse> popularNearby;
}
