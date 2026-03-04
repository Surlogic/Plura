package com.plura.plurabackend.search.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SearchSuggestItemResponse {
    private String id;
    private String name;
}
