package com.plura.plurabackend.search.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SearchResponse {
    private int page;
    private int size;
    private long total;
    private List<SearchItemResponse> items;
}
