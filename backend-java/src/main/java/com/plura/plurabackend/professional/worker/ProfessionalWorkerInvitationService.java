package com.plura.plurabackend.professional.worker;

import com.plura.plurabackend.core.auth.PasswordPolicyService;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import com.plura.plurabackend.core.user.repository.UserRepository;
import com.plura.plurabackend.professional.application.ProfessionalSideEffectCoordinator;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.worker.dto.ProfessionalWorkerInvitationAcceptRequest;
import com.plura.plurabackend.professional.worker.dto.ProfessionalWorkerInvitationAcceptResponse;
import com.plura.plurabackend.professional.worker.dto.ProfessionalWorkerInvitationLookupResponse;
import com.plura.plurabackend.professional.worker.model.ProfessionalWorker;
import com.plura.plurabackend.professional.worker.model.ProfessionalWorkerStatus;
import com.plura.plurabackend.professional.worker.repository.ProfessionalWorkerRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Locale;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProfessionalWorkerInvitationService {

    private final ProfessionalWorkerRepository workerRepository;
    private final UserRepository userRepository;
    private final PasswordPolicyService passwordPolicyService;
    private final PasswordEncoder passwordEncoder;
    private final ProfessionalSideEffectCoordinator sideEffectCoordinator;

    public ProfessionalWorkerInvitationService(
        ProfessionalWorkerRepository workerRepository,
        UserRepository userRepository,
        PasswordPolicyService passwordPolicyService,
        PasswordEncoder passwordEncoder,
        ProfessionalSideEffectCoordinator sideEffectCoordinator
    ) {
        this.workerRepository = workerRepository;
        this.userRepository = userRepository;
        this.passwordPolicyService = passwordPolicyService;
        this.passwordEncoder = passwordEncoder;
        this.sideEffectCoordinator = sideEffectCoordinator;
    }

    @Transactional(readOnly = true)
    public ProfessionalWorkerInvitationLookupResponse lookup(String rawToken) {
        ProfessionalWorker worker = loadPendingInvitation(rawToken);
        User existingUser = userRepository.findByEmailAndDeletedAtIsNull(worker.getEmail()).orElse(null);
        ProfessionalProfile profile = worker.getProfessional();
        return new ProfessionalWorkerInvitationLookupResponse(
            worker.getEmail(),
            worker.getDisplayName(),
            profile == null || profile.getId() == null ? null : String.valueOf(profile.getId()),
            resolveProfessionalName(profile),
            worker.getInviteExpiresAt(),
            existingUser == null
        );
    }

    @Transactional
    public ProfessionalWorkerInvitationAcceptResponse accept(ProfessionalWorkerInvitationAcceptRequest request) {
        if (request == null || request.getToken() == null || request.getToken().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Token invÃ¡lido");
        }
        ProfessionalWorker worker = loadPendingInvitation(request.getToken());
        User user = userRepository.findByEmailAndDeletedAtIsNull(worker.getEmail()).orElse(null);
        boolean accountCreated = false;
        if (user == null) {
            user = createUserForWorker(worker, request);
            accountCreated = true;
        }

        worker.setUser(user);
        worker.setStatus(ProfessionalWorkerStatus.ACTIVE);
        worker.setAcceptedAt(LocalDateTime.now());
        worker.setInviteTokenHash(null);
        worker.setInviteExpiresAt(null);
        ProfessionalWorker saved = workerRepository.save(worker);
        sideEffectCoordinator.onProfileChanged(saved.getProfessional());

        return new ProfessionalWorkerInvitationAcceptResponse(
            saved.getEmail(),
            saved.getDisplayName(),
            saved.getProfessional() == null || saved.getProfessional().getId() == null
                ? null
                : String.valueOf(saved.getProfessional().getId()),
            resolveProfessionalName(saved.getProfessional()),
            accountCreated
        );
    }

    private ProfessionalWorker loadPendingInvitation(String rawToken) {
        String token = rawToken == null ? "" : rawToken.trim();
        if (token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Token invÃ¡lido");
        }
        ProfessionalWorker worker = workerRepository.findByInviteTokenHashAndStatus(
                hashToken(token),
                ProfessionalWorkerStatus.INVITED
            )
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "InvitaciÃ³n no encontrada"));
        if (worker.getInviteExpiresAt() == null || worker.getInviteExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.GONE, "La invitaciÃ³n venciÃ³");
        }
        return worker;
    }

    private User createUserForWorker(ProfessionalWorker worker, ProfessionalWorkerInvitationAcceptRequest request) {
        String fullName = normalizeRequired(request.getFullName(), "Nombre invÃ¡lido");
        String phoneNumber = normalizeRequired(request.getPhoneNumber(), "TelÃ©fono invÃ¡lido");
        passwordPolicyService.validateNewPassword(request.getPassword());

        User user = new User();
        user.setFullName(fullName);
        user.setEmail(worker.getEmail().trim().toLowerCase(Locale.ROOT));
        user.setPhoneNumber(phoneNumber);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(UserRole.USER);
        try {
            return userRepository.save(user);
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ese email ya no estÃ¡ disponible");
        }
    }

    private String normalizeRequired(String rawValue, String message) {
        if (rawValue == null || rawValue.trim().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return rawValue.trim();
    }

    private String resolveProfessionalName(ProfessionalProfile profile) {
        if (profile == null) {
            return "Plura";
        }
        if (profile.getDisplayName() != null && !profile.getDisplayName().isBlank()) {
            return profile.getDisplayName();
        }
        if (profile.getUser() != null && profile.getUser().getFullName() != null) {
            return profile.getUser().getFullName();
        }
        return "Plura";
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception exception) {
            throw new IllegalStateException("No se pudo validar token de invitaciÃ³n", exception);
        }
    }
}
