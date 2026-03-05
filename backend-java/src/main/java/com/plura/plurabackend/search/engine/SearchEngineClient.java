package com.plura.plurabackend.search.engine;

import com.plura.plurabackend.search.SearchQueryCriteria;
import com.plura.plurabackend.search.SearchSuggestCriteria;
import com.plura.plurabackend.search.dto.SearchSuggestResponse;
import java.util.List;

public interface SearchEngineClient {
    SearchEngineSearchResult search(SearchQueryCriteria criteria);

    SearchSuggestResponse suggest(SearchSuggestCriteria criteria);

    void upsertDocuments(List<SearchIndexDocument> documents);
}
