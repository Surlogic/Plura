package com.plura.plurabackend.core.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.Cookie;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class CookieOriginProtectionFilterTest {

    @Test
    void completeOAuthPhoneWithAuthCookieRequiresOrigin() throws Exception {
        CookieOriginProtectionFilter filter = new CookieOriginProtectionFilter("https://app.example.com", false);
        MockHttpServletRequest request = postRequest("/auth/oauth/complete-phone");
        request.setCookies(new Cookie("plura_access_token", "access-token"));
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicBoolean chainCalled = new AtomicBoolean(false);

        filter.doFilter(request, response, chain(chainCalled));

        assertEquals(403, response.getStatus());
        assertFalse(chainCalled.get());
    }

    @Test
    void publicOAuthEndpointRemainsExemptFromCookieOriginProtection() throws Exception {
        CookieOriginProtectionFilter filter = new CookieOriginProtectionFilter("https://app.example.com", false);
        MockHttpServletRequest request = postRequest("/auth/oauth");
        request.setCookies(new Cookie("plura_access_token", "access-token"));
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicBoolean chainCalled = new AtomicBoolean(false);

        filter.doFilter(request, response, chain(chainCalled));

        assertEquals(200, response.getStatus());
        assertTrue(chainCalled.get());
    }

    private static MockHttpServletRequest postRequest(String path) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", path);
        request.setScheme("https");
        request.setServerName("api.example.com");
        request.setServerPort(443);
        return request;
    }

    private static FilterChain chain(AtomicBoolean chainCalled) {
        return (request, response) -> chainCalled.set(true);
    }
}
