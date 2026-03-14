package com.plura.plurabackend.core.search.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SearchSuggestCategoryResponse {
    private String name;
    private String slug;
}
