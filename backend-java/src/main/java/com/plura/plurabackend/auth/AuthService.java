package com.plura.plurabackend.auth;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.plura.plurabackend.auth.dto.RegisterRequest;
import com.plura.plurabackend.auth.dto.RegisterProfesionalRequest;
import com.plura.plurabackend.auth.dto.RegisterResponse;
import com.plura.plurabackend.auth.dto.UserResponse;
import com.plura.plurabackend.users.model.TipoCliente;
import com.plura.plurabackend.users.model.UserCliente;
import com.plura.plurabackend.users.model.UserNormal;
import com.plura.plurabackend.users.repository.UserClienteRepository;
import com.plura.plurabackend.users.repository.UserNormalRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
public class AuthService {

    private final UserNormalRepository userNormalRepository;
    private final UserClienteRepository userClienteRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final Algorithm jwtAlgorithm;

    public AuthService(
        UserNormalRepository userNormalRepository,
        UserClienteRepository userClienteRepository,
        BCryptPasswordEncoder passwordEncoder,
        @Value("${jwt.secret}") String jwtSecret
    ) {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET no está configurado");
        }
        this.userNormalRepository = userNormalRepository;
        this.userClienteRepository = userClienteRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtAlgorithm = Algorithm.HMAC256(jwtSecret);
    }

    public RegisterResponse registerCliente(RegisterRequest request) {
        boolean exists = userNormalRepository.findByEmail(request.getEmail()).isPresent();
        if (exists) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El correo ya está registrado");
        }

        UserNormal user = new UserNormal();
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPhoneNumber(request.getPhoneNumber());
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

    public RegisterResponse registerProfesional(RegisterProfesionalRequest request) {
        boolean exists = userClienteRepository.findByEmail(request.getEmail()).isPresent();
        if (exists) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El correo ya está registrado");
        }

        if (request.getTipoCliente() != TipoCliente.SIN_LOCAL) {
            if (request.getLocation() == null || request.getLocation().isBlank()) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La ubicación es obligatoria para locales o profesionales con local propio"
                );
            }
        }

        UserCliente user = new UserCliente();
        user.setFullName(request.getFullName());
        user.setRubro(request.getRubro());
        user.setEmail(request.getEmail());
        user.setPhoneNumber(request.getPhoneNumber());
        user.setLocation(request.getTipoCliente() == TipoCliente.SIN_LOCAL ? null : request.getLocation());
        user.setTipoCliente(request.getTipoCliente());
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        UserCliente saved = userClienteRepository.save(user);

        String token = JWT.create()
            .withSubject(saved.getId())
            .withClaim("email", saved.getEmail())
            .withClaim("type", "profesional")
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
