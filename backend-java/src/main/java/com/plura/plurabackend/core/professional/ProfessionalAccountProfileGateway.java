package com.plura.plurabackend.core.professional;

import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.professional.model.ProfessionalProfile;

public interface ProfessionalAccountProfileGateway {

    ProfessionalProfile createRegisteredProfile(User user, ProfessionalProfileRegistrationCommand command);

    ProfessionalProfile loadOrBootstrapProfile(User user);
}
