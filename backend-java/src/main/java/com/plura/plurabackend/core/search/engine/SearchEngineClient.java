package com.plura.plurabackend.core.search.engine;

import com.plura.plurabackend.core.search.SearchQueryCriteria;
import com.plura.plurabackend.core.search.SearchSuggestCriteria;
import com.plura.plurabackend.core.search.dto.SearchSuggestResponse;
import java.util.List;

public interface SearchEngineClient {
    SearchEngineSearchResult search(SearchQueryCriteria criteria);

    SearchSuggestResponse suggest(SearchSuggestCriteria criteria);

    void upsertDocuments(List<SearchIndexDocument> documents);
}
