package com.plura.plurabackend.core.search.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SearchSuggestItemResponse {
    private String id;
    private String name;
}
