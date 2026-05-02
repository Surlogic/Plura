package com.plura.plurabackend.professional.worker;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.plura.plurabackend.core.auth.TransactionalEmailService;
import com.plura.plurabackend.core.auth.TransactionalEmailService.TransactionalEmailMessage;
import com.plura.plurabackend.professional.application.ProfessionalAccessSupport;
import com.plura.plurabackend.professional.application.ProfessionalSideEffectCoordinator;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.plan.LimitCapability;
import com.plura.plurabackend.professional.plan.PlanGuardService;
import com.plura.plurabackend.professional.schedule.ProfessionalScheduleSupport;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import com.plura.plurabackend.professional.service.model.ProfesionalService;
import com.plura.plurabackend.professional.service.repository.ProfesionalServiceRepository;
import com.plura.plurabackend.professional.worker.dto.ProfessionalWorkerInvitationResponse;
import com.plura.plurabackend.professional.worker.dto.ProfessionalWorkerInviteRequest;
import com.plura.plurabackend.professional.worker.dto.ProfessionalWorkerResponse;
import com.plura.plurabackend.professional.worker.dto.ProfessionalWorkerServicesUpdateRequest;
import com.plura.plurabackend.professional.worker.dto.ProfessionalWorkerUpdateRequest;
import com.plura.plurabackend.professional.worker.model.ProfessionalWorker;
import com.plura.plurabackend.professional.worker.model.ProfessionalWorkerServiceAssignment;
import com.plura.plurabackend.professional.worker.model.ProfessionalWorkerStatus;
import com.plura.plurabackend.professional.worker.repository.ProfessionalWorkerRepository;
import com.plura.plurabackend.professional.worker.repository.ProfessionalWorkerServiceAssignmentRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProfessionalTeamService {

    private static final int DEFAULT_SLOT_DURATION_MINUTES = 15;
    private static final Set<Integer> ALLOWED_SLOT_DURATIONS = Set.of(10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60);
    private static final Collection<ProfessionalWorkerStatus> COUNTED_WORKER_STATUSES = List.of(
        ProfessionalWorkerStatus.INVITED,
        ProfessionalWorkerStatus.ACTIVE,
        ProfessionalWorkerStatus.SUSPENDED
    );
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final ProfessionalAccessSupport professionalAccessSupport;
    private final ProfessionalWorkerRepository workerRepository;
    private final ProfessionalWorkerServiceAssignmentRepository assignmentRepository;
    private final ProfesionalServiceRepository profesionalServiceRepository;
    private final PlanGuardService planGuardService;
    private final ProfessionalSideEffectCoordinator sideEffectCoordinator;
    private final TransactionalEmailService transactionalEmailService;
    private final ObjectMapper objectMapper;
    private final String publicWebUrl;

    public ProfessionalTeamService(
        ProfessionalAccessSupport professionalAccessSupport,
        ProfessionalWorkerRepository workerRepository,
        ProfessionalWorkerServiceAssignmentRepository assignmentRepository,
        ProfesionalServiceRepository profesionalServiceRepository,
        PlanGuardService planGuardService,
        ProfessionalSideEffectCoordinator sideEffectCoordinator,
        TransactionalEmailService transactionalEmailService,
        ObjectMapper objectMapper,
        @Value("${app.public-web-url:http://localhost:3002}") String publicWebUrl
    ) {
        this.professionalAccessSupport = professionalAccessSupport;
        this.workerRepository = workerRepository;
        this.assignmentRepository = assignmentRepository;
        this.profesionalServiceRepository = profesionalServiceRepository;
        this.planGuardService = planGuardService;
        this.sideEffectCoordinator = sideEffectCoordinator;
        this.transactionalEmailService = transactionalEmailService;
        this.objectMapper = objectMapper;
        this.publicWebUrl = publicWebUrl;
    }

    @Transactional(readOnly = true)
    public List<ProfessionalWorkerResponse> listWorkers(String rawUserId) {
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        List<ProfessionalWorker> workers = workerRepository.findByProfessional_IdAndStatusNotOrderByCreatedAtAsc(
            profile.getId(),
            ProfessionalWorkerStatus.REMOVED
        );
        Map<Long, List<String>> serviceIdsByWorkerId = assignmentRepository.findByProfessional_IdAndActiveTrue(profile.getId())
            .stream()
            .filter(assignment -> assignment.getWorker() != null && assignment.getWorker().getId() != null)
            .filter(assignment -> assignment.getService() != null && assignment.getService().getId() != null)
            .collect(Collectors.groupingBy(
                assignment -> assignment.getWorker().getId(),
                LinkedHashMap::new,
                Collectors.mapping(assignment -> assignment.getService().getId(), Collectors.toList())
            ));
        return workers.stream()
            .sorted(Comparator.comparing(worker -> !Boolean.TRUE.equals(worker.getOwner())))
            .map(worker -> toResponse(worker, serviceIdsByWorkerId.getOrDefault(worker.getId(), List.of())))
            .toList();
    }

    @Transactional
    public ProfessionalWorkerInvitationResponse inviteWorker(
        String rawUserId,
        ProfessionalWorkerInviteRequest request
    ) {
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        String email = normalizeEmail(request == null ? null : request.getEmail());
        workerRepository.findActiveLikeByProfessionalIdAndEmail(profile.getId(), email)
            .ifPresent(existing -> {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe un trabajador con ese email");
            });

        long nextWorkerCount = workerRepository.countByProfessional_IdAndStatusIn(
            profile.getId(),
            COUNTED_WORKER_STATUSES
        ) + 1;
        planGuardService.requireLimitNotExceeded(rawUserId, LimitCapability.MAX_PROFESSIONALS, nextWorkerCount);

        ProfesionalScheduleDto schedule = normalizeScheduleOrDefault(request.getSchedule(), profile.getScheduleJson());
        String rawToken = generateInviteToken();

        ProfessionalWorker worker = new ProfessionalWorker();
        worker.setProfessional(profile);
        worker.setEmail(email);
        worker.setDisplayName(resolveDisplayName(request.getDisplayName(), email));
        worker.setStatus(ProfessionalWorkerStatus.INVITED);
        worker.setOwner(false);
        worker.setScheduleJson(writeSchedule(schedule));
        worker.setSlotDurationMinutes(schedule.getSlotDurationMinutes());
        worker.setInviteTokenHash(hashToken(rawToken));
        worker.setInviteExpiresAt(LocalDateTime.now().plusDays(14));
        worker.setInvitedByUserId(professionalAccessSupport.parseUserId(rawUserId));
        ProfessionalWorker saved = workerRepository.save(worker);

        replaceWorkerServices(profile, saved, request.getServiceIds());
        sideEffectCoordinator.onProfileChanged(profile);

        TransactionalEmailService.DeliveryStatus deliveryStatus = sendInvitationEmail(profile, saved, rawToken);
        return new ProfessionalWorkerInvitationResponse(
            toResponse(saved, normalizeServiceIds(request.getServiceIds())),
            deliveryStatus
        );
    }

    @Transactional
    public ProfessionalWorkerResponse updateWorker(
        String rawUserId,
        Long workerId,
        ProfessionalWorkerUpdateRequest request
    ) {
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        ProfessionalWorker worker = loadWorker(profile, workerId);
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payload invÃ¡lido");
        }
        if (request.getDisplayName() != null) {
            String displayName = normalizeDisplayName(request.getDisplayName());
            if (displayName == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El nombre no puede estar vacÃ­o");
            }
            worker.setDisplayName(displayName);
        }
        if (request.getStatus() != null) {
            applyStatusChange(rawUserId, profile, worker, request.getStatus());
        }
        ProfessionalWorker saved = workerRepository.save(worker);
        sideEffectCoordinator.onProfileChanged(profile);
        return toResponse(saved, activeServiceIds(saved.getId()));
    }

    @Transactional(readOnly = true)
    public ProfesionalScheduleDto getWorkerSchedule(String rawUserId, Long workerId) {
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        ProfessionalWorker worker = loadWorker(profile, workerId);
        return readStoredSchedule(worker.getScheduleJson());
    }

    @Transactional
    public ProfessionalWorkerResponse updateWorkerSchedule(
        String rawUserId,
        Long workerId,
        ProfesionalScheduleDto request
    ) {
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        ProfessionalWorker worker = loadWorker(profile, workerId);
        ProfesionalScheduleDto schedule = normalizeSchedule(request);
        worker.setScheduleJson(writeSchedule(schedule));
        worker.setSlotDurationMinutes(schedule.getSlotDurationMinutes());
        ProfessionalWorker saved = workerRepository.save(worker);
        sideEffectCoordinator.onScheduleChanged(profile, 30);
        return toResponse(saved, activeServiceIds(saved.getId()));
    }

    @Transactional
    public ProfessionalWorkerResponse updateWorkerServices(
        String rawUserId,
        Long workerId,
        ProfessionalWorkerServicesUpdateRequest request
    ) {
        ProfessionalProfile profile = professionalAccessSupport.loadProfessionalByUserId(rawUserId);
        ProfessionalWorker worker = loadWorker(profile, workerId);
        List<String> serviceIds = request == null ? List.of() : request.getServiceIds();
        replaceWorkerServices(profile, worker, serviceIds);
        sideEffectCoordinator.onServiceCatalogChanged(profile, 30);
        return toResponse(worker, normalizeServiceIds(serviceIds));
    }

    private void applyStatusChange(
        String rawUserId,
        ProfessionalProfile profile,
        ProfessionalWorker worker,
        ProfessionalWorkerStatus nextStatus
    ) {
        if (Boolean.TRUE.equals(worker.getOwner())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El trabajador dueÃ±o no puede suspenderse ni eliminarse");
        }
        if (worker.getStatus() == ProfessionalWorkerStatus.REMOVED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El trabajador ya fue eliminado");
        }
        if (nextStatus == ProfessionalWorkerStatus.INVITED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se puede volver a estado invitado");
        }
        if (nextStatus == ProfessionalWorkerStatus.ACTIVE && worker.getUser() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El trabajador debe aceptar la invitaciÃ³n antes de activarse");
        }
        if (nextStatus != ProfessionalWorkerStatus.REMOVED && worker.getStatus() == ProfessionalWorkerStatus.SUSPENDED) {
            planGuardService.requireLimitNotExceeded(
                rawUserId,
                LimitCapability.MAX_PROFESSIONALS,
                workerRepository.countByProfessional_IdAndStatusIn(profile.getId(), COUNTED_WORKER_STATUSES)
            );
        }
        worker.setStatus(nextStatus);
        if (nextStatus == ProfessionalWorkerStatus.REMOVED) {
            assignmentRepository.findByWorker_IdAndActiveTrue(worker.getId()).forEach(assignment -> {
                assignment.setActive(false);
                assignmentRepository.save(assignment);
            });
        }
    }

    private void replaceWorkerServices(
        ProfessionalProfile profile,
        ProfessionalWorker worker,
        List<String> rawServiceIds
    ) {
        List<String> requestedServiceIds = normalizeServiceIds(rawServiceIds);
        Map<String, ProfesionalService> servicesById = loadOwnedServices(profile.getId(), requestedServiceIds);
        List<ProfessionalWorkerServiceAssignment> existingAssignments = assignmentRepository.findByWorker_Id(worker.getId());
        Map<String, ProfessionalWorkerServiceAssignment> existingByServiceId = existingAssignments.stream()
            .filter(assignment -> assignment.getService() != null && assignment.getService().getId() != null)
            .collect(Collectors.toMap(assignment -> assignment.getService().getId(), Function.identity(), (left, right) -> left));

        List<ProfessionalWorkerServiceAssignment> toSave = new ArrayList<>();
        for (ProfessionalWorkerServiceAssignment assignment : existingAssignments) {
            String serviceId = assignment.getService() == null ? null : assignment.getService().getId();
            if (serviceId != null && !requestedServiceIds.contains(serviceId) && Boolean.TRUE.equals(assignment.getActive())) {
                assignment.setActive(false);
                toSave.add(assignment);
            }
        }

        for (String serviceId : requestedServiceIds) {
            ProfessionalWorkerServiceAssignment existing = existingByServiceId.get(serviceId);
            if (existing != null) {
                if (!Boolean.TRUE.equals(existing.getActive())) {
                    existing.setActive(true);
                    toSave.add(existing);
                }
                continue;
            }
            ProfessionalWorkerServiceAssignment assignment = new ProfessionalWorkerServiceAssignment();
            assignment.setWorker(worker);
            assignment.setProfessional(profile);
            assignment.setService(servicesById.get(serviceId));
            assignment.setActive(true);
            toSave.add(assignment);
        }
        if (!toSave.isEmpty()) {
            assignmentRepository.saveAll(toSave);
        }
    }

    private Map<String, ProfesionalService> loadOwnedServices(Long professionalId, List<String> serviceIds) {
        if (serviceIds.isEmpty()) {
            return Map.of();
        }
        List<ProfesionalService> services = profesionalServiceRepository.findByProfessional_IdAndIdIn(
            professionalId,
            serviceIds
        );
        Map<String, ProfesionalService> servicesById = services.stream()
            .collect(Collectors.toMap(ProfesionalService::getId, Function.identity()));
        List<String> missing = serviceIds.stream()
            .filter(serviceId -> !servicesById.containsKey(serviceId))
            .toList();
        if (!missing.isEmpty()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Servicios invÃ¡lidos para este local: " + String.join(", ", missing)
            );
        }
        return servicesById;
    }

    private ProfessionalWorker loadWorker(ProfessionalProfile profile, Long workerId) {
        if (workerId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trabajador invÃ¡lido");
        }
        ProfessionalWorker worker = workerRepository.findByIdAndProfessional_Id(workerId, profile.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trabajador no encontrado"));
        if (worker.getStatus() == ProfessionalWorkerStatus.REMOVED) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Trabajador no encontrado");
        }
        return worker;
    }

    private List<String> activeServiceIds(Long workerId) {
        return assignmentRepository.findByWorker_IdAndActiveTrue(workerId)
            .stream()
            .filter(assignment -> assignment.getService() != null && assignment.getService().getId() != null)
            .map(assignment -> assignment.getService().getId())
            .toList();
    }

    private ProfessionalWorkerResponse toResponse(ProfessionalWorker worker, List<String> serviceIds) {
        return new ProfessionalWorkerResponse(
            worker.getId() == null ? null : String.valueOf(worker.getId()),
            worker.getProfessional() == null || worker.getProfessional().getId() == null
                ? null
                : String.valueOf(worker.getProfessional().getId()),
            worker.getUser() == null || worker.getUser().getId() == null ? null : String.valueOf(worker.getUser().getId()),
            worker.getEmail(),
            worker.getDisplayName(),
            worker.getStatus(),
            worker.getOwner(),
            readStoredSchedule(worker.getScheduleJson()),
            serviceIds == null ? List.of() : List.copyOf(serviceIds),
            worker.getAcceptedAt(),
            worker.getCreatedAt(),
            worker.getUpdatedAt()
        );
    }

    private ProfesionalScheduleDto normalizeScheduleOrDefault(
        ProfesionalScheduleDto request,
        String fallbackScheduleJson
    ) {
        if (request != null) {
            return normalizeSchedule(request);
        }
        return readStoredSchedule(fallbackScheduleJson);
    }

    private ProfesionalScheduleDto normalizeSchedule(ProfesionalScheduleDto request) {
        ProfessionalScheduleSupport.validateSchedule(request, this::validateSlotDuration);
        return ProfessionalScheduleSupport.normalizeSchedule(
            request,
            DEFAULT_SLOT_DURATION_MINUTES,
            this::normalizeSlotDurationOrDefault
        );
    }

    private ProfesionalScheduleDto readStoredSchedule(String rawScheduleJson) {
        return ProfessionalScheduleSupport.readStoredSchedule(
            objectMapper,
            rawScheduleJson,
            DEFAULT_SLOT_DURATION_MINUTES,
            this::normalizeSlotDurationOrDefault
        );
    }

    private String writeSchedule(ProfesionalScheduleDto schedule) {
        try {
            return objectMapper.writeValueAsString(schedule);
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo guardar el horario");
        }
    }

    private void validateSlotDuration(Integer value) {
        if (value == null || !ALLOWED_SLOT_DURATIONS.contains(value)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "La duraciÃ³n de turnos debe ser uno de: 10, 15, 20, 25, 30, 35, 40, 45, 50, 55 o 60"
            );
        }
    }

    private int normalizeSlotDurationOrDefault(Integer value) {
        if (value == null || !ALLOWED_SLOT_DURATIONS.contains(value)) {
            return DEFAULT_SLOT_DURATION_MINUTES;
        }
        return value;
    }

    private TransactionalEmailService.DeliveryStatus sendInvitationEmail(
        ProfessionalProfile profile,
        ProfessionalWorker worker,
        String rawToken
    ) {
        String inviteUrl = normalizedPublicWebUrl() + "/trabajador/invitacion?token=" + rawToken;
        String businessName = profile.getDisplayName() != null && !profile.getDisplayName().isBlank()
            ? profile.getDisplayName()
            : profile.getUser() == null ? "un local" : profile.getUser().getFullName();
        String subject = "Te invitaron a trabajar en " + businessName + " dentro de Plura";
        String textBody = "Hola " + worker.getDisplayName() + ".\n\n"
            + "Te invitaron a gestionar tu agenda y reservas de " + businessName + " en Plura.\n"
            + "CompletÃ¡ tu registro desde este link: " + inviteUrl + "\n\n"
            + "El link vence en 14 dÃ­as.";
        String htmlBody = "<p>Hola " + escapeHtml(worker.getDisplayName()) + ".</p>"
            + "<p>Te invitaron a gestionar tu agenda y reservas de <strong>" + escapeHtml(businessName) + "</strong> en Plura.</p>"
            + "<p><a href=\"" + inviteUrl + "\">Completar registro</a></p>"
            + "<p>El link vence en 14 dÃ­as.</p>";
        return transactionalEmailService.send(new TransactionalEmailMessage(
            "professional_worker_invitation",
            worker.getEmail(),
            worker.getDisplayName(),
            subject,
            htmlBody,
            textBody
        ));
    }

    private String normalizedPublicWebUrl() {
        String normalized = publicWebUrl == null || publicWebUrl.isBlank()
            ? "http://localhost:3002"
            : publicWebUrl.trim();
        while (normalized.endsWith("/")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private String normalizeEmail(String rawEmail) {
        if (rawEmail == null || rawEmail.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email invÃ¡lido");
        }
        return rawEmail.trim().toLowerCase(Locale.ROOT);
    }

    private String resolveDisplayName(String rawDisplayName, String email) {
        String displayName = normalizeDisplayName(rawDisplayName);
        if (displayName != null) {
            return displayName;
        }
        int atIndex = email == null ? -1 : email.indexOf('@');
        return atIndex > 0 ? email.substring(0, atIndex) : "Trabajador";
    }

    private String normalizeDisplayName(String rawDisplayName) {
        if (rawDisplayName == null) {
            return null;
        }
        String displayName = rawDisplayName.trim();
        return displayName.isBlank() ? null : displayName;
    }

    private List<String> normalizeServiceIds(List<String> rawServiceIds) {
        if (rawServiceIds == null || rawServiceIds.isEmpty()) {
            return List.of();
        }
        return rawServiceIds.stream()
            .filter(serviceId -> serviceId != null && !serviceId.trim().isBlank())
            .map(serviceId -> serviceId.trim())
            .collect(Collectors.toCollection(LinkedHashSet::new))
            .stream()
            .toList();
    }

    private String generateInviteToken() {
        byte[] randomBytes = new byte[48];
        SECURE_RANDOM.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
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
            throw new IllegalStateException("No se pudo hashear token de invitaciÃ³n", exception);
        }
    }

    private String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;");
    }
}
