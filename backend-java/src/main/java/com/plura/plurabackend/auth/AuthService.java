package com.plura.plurabackend.auth;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.plura.plurabackend.auth.dto.RegisterRequest;
import com.plura.plurabackend.auth.dto.RegisterProfesionalRequest;
import com.plura.plurabackend.auth.dto.RegisterResponse;
import com.plura.plurabackend.auth.dto.UserResponse;
import com.plura.plurabackend.users.model.TipoCliente;
import com.plura.plurabackend.users.model.UserCliente;
import com.plura.plurabackend.users.model.UserProfesional;
import com.plura.plurabackend.users.repository.UserClienteRepository;
import com.plura.plurabackend.users.repository.UserProfesionalRepository;
import org.springframework.beans.factory.annotation.Value;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
public class AuthService {

    private final UserClienteRepository userClienteRepository;
    private final UserProfesionalRepository userProfesionalRepository;
    private final PasswordEncoder passwordEncoder;
    private final Algorithm jwtAlgorithm;
    private final long jwtExpirationMinutes;
    private final String jwtIssuer;

    public AuthService(
        UserClienteRepository userClienteRepository,
        UserProfesionalRepository userProfesionalRepository,
        PasswordEncoder passwordEncoder,
        @Value("${jwt.secret}") String jwtSecret,
        @Value("${jwt.expiration-minutes:30}") long jwtExpirationMinutes,
        @Value("${jwt.issuer:plura}") String jwtIssuer
    ) {
        // Falla temprana si el secreto no está configurado.
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET no está configurado");
        }
        this.userClienteRepository = userClienteRepository;
        this.userProfesionalRepository = userProfesionalRepository;
        this.passwordEncoder = passwordEncoder;
        // Se mantiene el algoritmo en memoria para firmar/verificar tokens.
        this.jwtAlgorithm = Algorithm.HMAC256(jwtSecret);
        this.jwtExpirationMinutes = jwtExpirationMinutes;
        this.jwtIssuer = jwtIssuer;
    }

    public RegisterResponse registerCliente(RegisterRequest request) {
        // Verifica email duplicado para evitar registros repetidos.
        boolean exists = userClienteRepository.findByEmail(request.getEmail()).isPresent();
        if (exists) {
            // Mensaje genérico para evitar enumeración de usuarios.
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No se pudo crear la cuenta");
        }

        UserCliente user = new UserCliente();
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPhoneNumber(request.getPhoneNumber());
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        UserCliente saved = userClienteRepository.save(user);

        // Genera JWT con expiración y emisor.
        Date now = new Date();
        Date expiresAt = Date.from(Instant.now().plus(jwtExpirationMinutes, ChronoUnit.MINUTES));
        String token = JWT.create()
            .withSubject(saved.getId())
            .withClaim("email", saved.getEmail())
            .withClaim("type", "cliente")
            .withIssuer(jwtIssuer)
            .withIssuedAt(now)
            .withExpiresAt(expiresAt)
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
        // Verifica email duplicado para evitar registros repetidos.
        boolean exists = userProfesionalRepository.findByEmail(request.getEmail()).isPresent();
        if (exists) {
            // Mensaje genérico para evitar enumeración de usuarios.
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No se pudo crear la cuenta");
        }

        // Valida ubicación solo si el profesional declara tener local.
        if (request.getTipoCliente() != TipoCliente.SIN_LOCAL) {
            if (request.getLocation() == null || request.getLocation().isBlank()) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La ubicación es obligatoria para locales o profesionales con local propio"
                );
            }
        }

        UserProfesional user = new UserProfesional();
        user.setFullName(request.getFullName());
        user.setRubro(request.getRubro());
        user.setEmail(request.getEmail());
        user.setPhoneNumber(request.getPhoneNumber());
        user.setLocation(request.getTipoCliente() == TipoCliente.SIN_LOCAL ? null : request.getLocation());
        user.setTipoCliente(request.getTipoCliente());
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        UserProfesional saved = userProfesionalRepository.save(user);

        // Genera JWT con expiración y emisor.
        Date now = new Date();
        Date expiresAt = Date.from(Instant.now().plus(jwtExpirationMinutes, ChronoUnit.MINUTES));
        String token = JWT.create()
            .withSubject(saved.getId())
            .withClaim("email", saved.getEmail())
            .withClaim("type", "profesional")
            .withIssuer(jwtIssuer)
            .withIssuedAt(now)
            .withExpiresAt(expiresAt)
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
