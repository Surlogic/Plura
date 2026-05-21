package com.plura.plurabackend.core.security.jwt;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

class JwtLegacyDefaultConfigTest {

    @Test
    void legacyJwtIsDisabledByDefaultInApplicationConfig() throws Exception {
        URL resource = getClass().getClassLoader().getResource("application.yml");

        assertNotNull(resource);
        String yaml = Files.readString(Path.of(resource.toURI()));

        assertTrue(yaml.contains("allow-legacy-jwt: ${AUTH_ALLOW_LEGACY_JWT:false}"));
    }
}
