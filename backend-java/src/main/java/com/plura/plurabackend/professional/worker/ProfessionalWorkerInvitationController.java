package com.plura.plurabackend.professional.worker;

import com.plura.plurabackend.professional.worker.dto.ProfessionalWorkerInvitationAcceptRequest;
import com.plura.plurabackend.professional.worker.dto.ProfessionalWorkerInvitationAcceptResponse;
import com.plura.plurabackend.professional.worker.dto.ProfessionalWorkerInvitationLookupResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth/worker-invitations")
public class ProfessionalWorkerInvitationController {

    private final ProfessionalWorkerInvitationService invitationService;

    public ProfessionalWorkerInvitationController(ProfessionalWorkerInvitationService invitationService) {
        this.invitationService = invitationService;
    }

    @GetMapping
    public ResponseEntity<ProfessionalWorkerInvitationLookupResponse> lookup(@RequestParam String token) {
        return ResponseEntity.ok()
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .body(invitationService.lookup(token));
    }

    @PostMapping("/accept")
    public ResponseEntity<ProfessionalWorkerInvitationAcceptResponse> accept(
        @Valid @RequestBody ProfessionalWorkerInvitationAcceptRequest request
    ) {
        return ResponseEntity.ok()
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .body(invitationService.accept(request));
    }
}
