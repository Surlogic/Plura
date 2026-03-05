package com.plura.plurabackend.auth.oauth;

public record OAuthUserInfo(
    String provider,
    String providerId,
    String email,
    String name,
    String avatar
) {}
