package com.plura.plurabackend.professional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.plura.plurabackend.core.billing.BillingProperties;
import com.plura.plurabackend.core.booking.finance.repository.BookingFinancialSummaryRepository;
import com.plura.plurabackend.core.booking.model.ServicePaymentType;
import com.plura.plurabackend.professional.dto.ProfessionalPayoutConfigResponse;
import com.plura.plurabackend.professional.dto.ProfessionalPayoutConfigUpdateRequest;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.payout.ProfessionalPayoutConfigService;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import com.plura.plurabackend.core.user.model.User;
import com.plura.plurabackend.core.user.model.UserRole;
import com.plura.plurabackend.core.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ProfessionalPayoutConfigServiceTest {

    private final ProfessionalProfileRepository professionalProfileRepository = mock(ProfessionalProfileRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final BookingFinancialSummaryRepository bookingFinancialSummaryRepository = mock(BookingFinancialSummaryRepository.class);
    private ProfessionalPayoutConfigService service;

    @BeforeEach
    void setUp() {
        BillingProperties billingProperties = new BillingProperties();
        billingProperties.getDlocal().setCountry("UY");
        service = new ProfessionalPayoutConfigService(
            professionalProfileRepository,
            userRepository,
            bookingFinancialSummaryRepository,
            billingProperties
        );
    }

    @Test
    void shouldReportIncompletePayoutConfigWhenRequiredFieldsAreMissing() {
        User user = professionalUser();
        user.setPhoneNumber(null);
        ProfessionalProfile profile = profileFor(user);

        when(userRepository.findByIdAndDeletedAtIsNull(user.getId())).thenReturn(Optional.of(user));
        when(professionalProfileRepository.findByUser_Id(user.getId())).thenReturn(Optional.of(profile));
        when(bookingFinancialSummaryRepository.countOutstandingPaidBookingsForProfessional(eq(profile.getId()), anyCollection(), eq(ServicePaymentType.ON_SITE)))
            .thenReturn(2L);

        ProfessionalPayoutConfigResponse response = service.getConfig(String.valueOf(user.getId()));

        assertEquals("INCOMPLETE", response.getStatus());
        assertFalse(response.isReadyToReceivePayouts());
        assertEquals("UY", response.getCountry());
        assertFalse(response.isSplitPaymentsEnabled());
        assertTrue(response.getMissingFields().contains("firstName"));
        assertTrue(response.getMissingFields().contains("branch"));
        assertTrue(response.getMissingFields().contains("phone"));
        assertEquals(2L, response.getOutstandingPaidBookingsCount());
    }

    @Test
    void shouldReportErrorWhenFieldsArePresentButPayoutIsNotEnabled() {
        User user = professionalUser();
        user.setPhoneNumber("+59811111111");
        ProfessionalProfile profile = readyProfile(user);
        profile.setDlocalPayoutEnabled(false);

        when(userRepository.findByIdAndDeletedAtIsNull(user.getId())).thenReturn(Optional.of(user));
        when(professionalProfileRepository.findByUser_Id(user.getId())).thenReturn(Optional.of(profile));
        when(bookingFinancialSummaryRepository.countOutstandingPaidBookingsForProfessional(eq(profile.getId()), anyCollection(), eq(ServicePaymentType.ON_SITE)))
            .thenReturn(0L);

        ProfessionalPayoutConfigResponse response = service.getConfig(String.valueOf(user.getId()));

        assertEquals("ERROR", response.getStatus());
        assertFalse(response.isReadyToReceivePayouts());
        assertTrue(response.getMissingFields().isEmpty());
        assertTrue(response.getInvalidFields().isEmpty());
    }

    @Test
    void shouldPersistNormalizedPayoutConfigAndEnablePayoutsWhenReady() {
        User user = professionalUser();
        user.setPhoneNumber("+59800000000");
        user.setPhoneVerifiedAt(LocalDateTime.now());
        ProfessionalProfile profile = profileFor(user);

        when(userRepository.findByIdAndDeletedAtIsNull(user.getId())).thenReturn(Optional.of(user));
        when(professionalProfileRepository.findByUser_Id(user.getId())).thenReturn(Optional.of(profile));
        when(professionalProfileRepository.save(any(ProfessionalProfile.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(bookingFinancialSummaryRepository.countOutstandingPaidBookingsForProfessional(eq(profile.getId()), anyCollection(), eq(ServicePaymentType.ON_SITE)))
            .thenReturn(0L);

        ProfessionalPayoutConfigUpdateRequest request = new ProfessionalPayoutConfigUpdateRequest();
        request.setFirstName(" Ana ");
        request.setLastName(" Perez ");
        request.setCountry("uy");
        request.setDocumentType("ci");
        request.setDocumentNumber("12345678");
        request.setPhone("+59899999999");
        request.setBank("brou");
        request.setAccountNumber("00123456789");
        request.setAccountType("caja");
        request.setBranch("001");
        request.setSplitCode("seller-contract-001");

        ProfessionalPayoutConfigResponse response = service.updateConfig(String.valueOf(user.getId()), request);

        assertEquals("READY", response.getStatus());
        assertTrue(response.isReadyToReceivePayouts());
        assertTrue(response.isSplitPaymentsEnabled());
        assertTrue(profile.getDlocalPayoutEnabled());
        assertEquals("seller-contract-001", profile.getDlocalSplitCode());
        assertEquals("UY", profile.getDlocalPayoutCountry());
        assertEquals("CI", profile.getDlocalBeneficiaryDocumentType());
        assertEquals("BROU", profile.getDlocalBankCode());
        assertEquals("+59899999999", user.getPhoneNumber());
        assertNull(user.getPhoneVerifiedAt());
    }

    private User professionalUser() {
        User user = new User();
        user.setId(55L);
        user.setRole(UserRole.PROFESSIONAL);
        user.setEmail("profesional@test.com");
        return user;
    }

    private ProfessionalProfile profileFor(User user) {
        ProfessionalProfile profile = new ProfessionalProfile();
        profile.setId(9L);
        profile.setUser(user);
        profile.setRubro("Peluqueria");
        profile.setCountry("Uruguay");
        profile.setDlocalPayoutEnabled(false);
        return profile;
    }

    private ProfessionalProfile readyProfile(User user) {
        ProfessionalProfile profile = profileFor(user);
        profile.setDlocalPayoutCountry("UY");
        profile.setDlocalBeneficiaryFirstName("Ana");
        profile.setDlocalBeneficiaryLastName("Perez");
        profile.setDlocalBeneficiaryDocumentType("CI");
        profile.setDlocalBeneficiaryDocumentNumber("12345678");
        profile.setDlocalBankCode("BROU");
        profile.setDlocalBankAccountNumber("00123456789");
        profile.setDlocalBankAccountType("CAJA");
        profile.setDlocalBankBranch("001");
        return profile;
    }
}
