package com.plura.plurabackend.auth;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.plura.plurabackend.auth.dto.RegisterRequest;
import com.plura.plurabackend.auth.dto.RegisterResponse;
import com.plura.plurabackend.auth.dto.UserResponse;
import com.plura.plurabackend.users.model.UserNormal;
import com.plura.plurabackend.users.repository.UserNormalRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
public class AuthService {

    private final UserNormalRepository userNormalRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final Algorithm jwtAlgorithm;

    public AuthService(
        UserNormalRepository userNormalRepository,
        BCryptPasswordEncoder passwordEncoder,
        @Value("${jwt.secret}") String jwtSecret
    ) {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET no está configurado");
        }
        this.userNormalRepository = userNormalRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtAlgorithm = Algorithm.HMAC256(jwtSecret);
    }

    public RegisterResponse register(RegisterRequest request) {
        boolean exists = userNormalRepository.findByEmail(request.getEmail()).isPresent();
        if (exists) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El correo ya está registrado");
        }

        UserNormal user = new UserNormal();
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        UserNormal saved = userNormalRepository.save(user);

        String token = JWT.create()
            .withSubject(saved.getId())
            .withClaim("email", saved.getEmail())
            .withClaim("type", "normal")
            .sign(jwtAlgorithm);

        UserResponse userResponse = new UserResponse(
            saved.getId(),
            saved.getEmail(),
            saved.getFullName(),
            saved.getCreatedAt()
        );

        return new RegisterResponse(token, userResponse);
    }
}
