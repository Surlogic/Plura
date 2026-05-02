package com.plura.plurabackend.professional.worker;

import com.plura.plurabackend.core.security.RoleGuard;
import com.plura.plurabackend.professional.schedule.dto.ProfesionalScheduleDto;
import com.plura.plurabackend.professional.worker.dto.ProfessionalWorkerInvitationResponse;
import com.plura.plurabackend.professional.worker.dto.ProfessionalWorkerInviteRequest;
import com.plura.plurabackend.professional.worker.dto.ProfessionalWorkerResponse;
import com.plura.plurabackend.professional.worker.dto.ProfessionalWorkerServicesUpdateRequest;
import com.plura.plurabackend.professional.worker.dto.ProfessionalWorkerUpdateRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/profesional/team")
public class ProfessionalTeamController {

    private final ProfessionalTeamService professionalTeamService;
    private final RoleGuard roleGuard;

    public ProfessionalTeamController(
        ProfessionalTeamService professionalTeamService,
        RoleGuard roleGuard
    ) {
        this.professionalTeamService = professionalTeamService;
        this.roleGuard = roleGuard;
    }

    @GetMapping
    public List<ProfessionalWorkerResponse> listWorkers() {
        return professionalTeamService.listWorkers(currentProfessionalUserId());
    }

    @PostMapping("/invitations")
    @ResponseStatus(HttpStatus.CREATED)
    public ProfessionalWorkerInvitationResponse inviteWorker(
        @Valid @RequestBody ProfessionalWorkerInviteRequest request
    ) {
        return professionalTeamService.inviteWorker(currentProfessionalUserId(), request);
    }

    @PatchMapping("/{workerId}")
    public ProfessionalWorkerResponse updateWorker(
        @PathVariable Long workerId,
        @Valid @RequestBody ProfessionalWorkerUpdateRequest request
    ) {
        return professionalTeamService.updateWorker(currentProfessionalUserId(), workerId, request);
    }

    @GetMapping("/{workerId}/schedule")
    public ProfesionalScheduleDto getWorkerSchedule(@PathVariable Long workerId) {
        return professionalTeamService.getWorkerSchedule(currentProfessionalUserId(), workerId);
    }

    @PutMapping("/{workerId}/schedule")
    public ProfessionalWorkerResponse updateWorkerSchedule(
        @PathVariable Long workerId,
        @Valid @RequestBody ProfesionalScheduleDto request
    ) {
        return professionalTeamService.updateWorkerSchedule(currentProfessionalUserId(), workerId, request);
    }

    @PutMapping("/{workerId}/services")
    public ProfessionalWorkerResponse updateWorkerServices(
        @PathVariable Long workerId,
        @Valid @RequestBody ProfessionalWorkerServicesUpdateRequest request
    ) {
        return professionalTeamService.updateWorkerServices(currentProfessionalUserId(), workerId, request);
    }

    private String currentProfessionalUserId() {
        return String.valueOf(roleGuard.requireProfessional());
    }
}
