package com.plura.plurabackend.core.auth.context;

import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import com.plura.plurabackend.professional.worker.model.ProfessionalWorker;
import com.plura.plurabackend.professional.worker.model.ProfessionalWorkerStatus;
import com.plura.plurabackend.professional.worker.repository.ProfessionalWorkerRepository;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthContextResolver {

    private final ProfessionalProfileRepository professionalProfileRepository;
    private final ProfessionalWorkerRepository workerRepository;

    public AuthContextResolver(
        ProfessionalProfileRepository professionalProfileRepository,
        ProfessionalWorkerRepository workerRepository
    ) {
        this.professionalProfileRepository = professionalProfileRepository;
        this.workerRepository = workerRepository;
    }

    @Transactional(readOnly = true)
    public List<AuthContextDescriptor> resolve(User user) {
        if (user == null || user.getDeletedAt() != null) {
            return List.of();
        }
        List<AuthContextDescriptor> contexts = new ArrayList<>();
        if (user.getRole() == UserRole.USER || user.getRole() == UserRole.PROFESSIONAL) {
            contexts.add(new AuthContextDescriptor(AuthContextType.CLIENT, null, null, null, null, null, false));
        }

        ProfessionalProfile profile = professionalProfileRepository.findByUser_Id(user.getId()).orElse(null);
        if (profile != null && Boolean.TRUE.equals(profile.getActive())) {
            contexts.add(new AuthContextDescriptor(
                AuthContextType.PROFESSIONAL,
                String.valueOf(profile.getId()),
                resolveProfessionalName(profile),
                profile.getSlug(),
                null,
                null,
                true
            ));
        }

        List<ProfessionalWorker> workers = workerRepository.findByUser_IdAndStatus(user.getId(), ProfessionalWorkerStatus.ACTIVE);
        for (ProfessionalWorker worker : workers) {
            if (Boolean.TRUE.equals(worker.getOwner())) {
                continue;
            }
            ProfessionalProfile workerProfile = worker.getProfessional();
            if (workerProfile == null || !Boolean.TRUE.equals(workerProfile.getActive())) {
                continue;
            }
            contexts.add(new AuthContextDescriptor(
                AuthContextType.WORKER,
                String.valueOf(workerProfile.getId()),
                resolveProfessionalName(workerProfile),
                workerProfile.getSlug(),
                String.valueOf(worker.getId()),
                worker.getDisplayName(),
                false
            ));
        }
        return contexts;
    }

    public AuthContextDescriptor pickDefault(List<AuthContextDescriptor> contexts) {
        if (contexts == null || contexts.isEmpty()) {
            return null;
        }
        for (AuthContextDescriptor descriptor : contexts) {
            if (descriptor.type() == AuthContextType.PROFESSIONAL) {
                return descriptor;
            }
        }
        for (AuthContextDescriptor descriptor : contexts) {
            if (descriptor.type() == AuthContextType.WORKER) {
                return descriptor;
            }
        }
        return contexts.get(0);
    }

    public AuthContextDescriptor select(
        List<AuthContextDescriptor> contexts,
        AuthContextType type,
        String workerId,
        String professionalId
    ) {
        if (contexts == null || contexts.isEmpty()) {
            return null;
        }
        if (type == null) {
            return null;
        }
        for (AuthContextDescriptor descriptor : contexts) {
            if (descriptor.type() != type) {
                continue;
            }
            if (type == AuthContextType.WORKER) {
                if (workerId != null && workerId.equals(descriptor.workerId())) {
                    return descriptor;
                }
                if (workerId == null && professionalId != null && professionalId.equals(descriptor.professionalId())) {
                    return descriptor;
                }
                continue;
            }
            if (type == AuthContextType.PROFESSIONAL) {
                if (professionalId == null || professionalId.equals(descriptor.professionalId())) {
                    return descriptor;
                }
                continue;
            }
            return descriptor;
        }
        return null;
    }

    private String resolveProfessionalName(ProfessionalProfile profile) {
        if (profile == null) {
            return null;
        }
        if (profile.getDisplayName() != null && !profile.getDisplayName().isBlank()) {
            return profile.getDisplayName();
        }
        if (profile.getUser() != null && profile.getUser().getFullName() != null && !profile.getUser().getFullName().isBlank()) {
            return profile.getUser().getFullName();
        }
        return null;
    }
}
