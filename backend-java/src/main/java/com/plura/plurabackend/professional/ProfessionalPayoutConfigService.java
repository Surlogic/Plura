package com.plura.plurabackend.professional;

import com.plura.plurabackend.billing.BillingProperties;
import com.plura.plurabackend.booking.finance.model.BookingFinancialStatus;
import com.plura.plurabackend.booking.finance.repository.BookingFinancialSummaryRepository;
import com.plura.plurabackend.booking.model.ServicePaymentType;
import com.plura.plurabackend.professional.dto.ProfessionalPayoutConfigResponse;
import com.plura.plurabackend.professional.dto.ProfessionalPayoutConfigUpdateRequest;
import com.plura.plurabackend.professional.model.ProfessionalProfile;
import com.plura.plurabackend.professional.repository.ProfessionalProfileRepository;
import com.plura.plurabackend.user.model.User;
import com.plura.plurabackend.user.model.UserRole;
import com.plura.plurabackend.user.repository.UserRepository;
import jakarta.transaction.Transactional;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProfessionalPayoutConfigService {

    private static final Pattern NAME_PATTERN = Pattern.compile("^[\\p{L} .'-]{2,120}$");
    private static final Pattern COUNTRY_PATTERN = Pattern.compile("^[A-Z]{2}$");
    private static final Pattern DOCUMENT_TYPE_PATTERN = Pattern.compile("^[A-Za-z0-9_\\- ]{2,30}$");
    private static final Pattern DOCUMENT_NUMBER_PATTERN = Pattern.compile("^[A-Za-z0-9./\\-\\s]{3,64}$");
    private static final Pattern PHONE_PATTERN = Pattern.compile("^[+0-9()\\-\\s]{3,30}$");
    private static final Pattern BANK_PATTERN = Pattern.compile("^[A-Za-z0-9._\\-/\\s]{2,20}$");
    private static final Pattern ACCOUNT_NUMBER_PATTERN = Pattern.compile("^[A-Za-z0-9\\-\\s]{4,64}$");
    private static final Pattern ACCOUNT_TYPE_PATTERN = Pattern.compile("^[A-Za-z0-9_\\-\\s]{2,20}$");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Pattern SPLIT_CODE_PATTERN = Pattern.compile("^[A-Za-z0-9._:\\-]{3,120}$");

    private static final List<String> BASE_REQUIRED_FIELDS = List.of(
        "firstName",
        "lastName",
        "country",
        "documentType",
        "documentNumber",
        "email",
        "phone",
        "bank",
        "accountNumber",
        "accountType"
    );

    private static final List<BookingFinancialStatus> OUTSTANDING_PAYOUT_STATUSES = List.of(
        BookingFinancialStatus.HELD,
        BookingFinancialStatus.RELEASE_PENDING,
        BookingFinancialStatus.PARTIALLY_RELEASED,
        BookingFinancialStatus.FAILED
    );

    private final ProfessionalProfileRepository professionalProfileRepository;
    private final UserRepository userRepository;
    private final BookingFinancialSummaryRepository bookingFinancialSummaryRepository;
    private final BillingProperties billingProperties;

    public ProfessionalPayoutConfigService(
        ProfessionalProfileRepository professionalProfileRepository,
        UserRepository userRepository,
        BookingFinancialSummaryRepository bookingFinancialSummaryRepository,
        BillingProperties billingProperties
    ) {
        this.professionalProfileRepository = professionalProfileRepository;
        this.userRepository = userRepository;
        this.bookingFinancialSummaryRepository = bookingFinancialSummaryRepository;
        this.billingProperties = billingProperties;
    }

    @Transactional
    public ProfessionalPayoutConfigResponse getConfig(String rawUserId) {
        LoadedProfessional loaded = loadProfessional(rawUserId);
        return toResponse(loaded.profile(), loaded.user());
    }

    @Transactional
    public ProfessionalPayoutConfigResponse updateConfig(
        String rawUserId,
        ProfessionalPayoutConfigUpdateRequest request
    ) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payload inválido");
        }

        LoadedProfessional loaded = loadProfessional(rawUserId);
        ProfessionalProfile profile = loaded.profile();
        User user = loaded.user();

        profile.setDlocalBeneficiaryFirstName(normalizeName(request.getFirstName()));
        profile.setDlocalBeneficiaryLastName(normalizeName(request.getLastName()));
        profile.setDlocalPayoutCountry(normalizeCountry(request.getCountry()));
        profile.setDlocalBeneficiaryDocumentType(normalizeUppercase(request.getDocumentType()));
        profile.setDlocalBeneficiaryDocumentNumber(normalizeValue(request.getDocumentNumber()));
        profile.setDlocalBankCode(normalizeUppercase(request.getBank()));
        profile.setDlocalBankAccountNumber(normalizeValue(request.getAccountNumber()));
        profile.setDlocalBankAccountType(normalizeUppercase(request.getAccountType()));
        profile.setDlocalBankBranch(normalizeUppercase(request.getBranch()));
        profile.setDlocalSplitCode(normalizeSplitCode(request.getSplitCode()));

        String nextPhone = normalizeValue(request.getPhone());
        if (!sameValue(user.getPhoneNumber(), nextPhone)) {
            user.setPhoneNumber(nextPhone);
            user.setPhoneVerifiedAt(null);
        }

        PayoutAssessment assessment = assess(profile, user);
        profile.setDlocalPayoutEnabled(assessment.fieldsComplete());

        professionalProfileRepository.save(profile);
        userRepository.save(user);

        return toResponse(profile, user, assessment);
    }

    private ProfessionalPayoutConfigResponse toResponse(
        ProfessionalProfile profile,
        User user
    ) {
        return toResponse(profile, user, assess(profile, user));
    }

    private ProfessionalPayoutConfigResponse toResponse(
        ProfessionalProfile profile,
        User user,
        PayoutAssessment assessment
    ) {
        long outstandingPaidBookingsCount = bookingFinancialSummaryRepository.countOutstandingPaidBookingsForProfessional(
            profile,
            OUTSTANDING_PAYOUT_STATUSES,
            ServicePaymentType.ON_SITE
        );

        boolean payoutEnabled = Boolean.TRUE.equals(profile.getDlocalPayoutEnabled());
        String splitCode = normalizeSplitCode(profile.getDlocalSplitCode());
        boolean splitPaymentsEnabled = splitCode != null && SPLIT_CODE_PATTERN.matcher(splitCode).matches();
        boolean readyToReceivePayouts = assessment.fieldsComplete() && payoutEnabled;
        String status = resolveStatus(assessment, payoutEnabled);

        return new ProfessionalPayoutConfigResponse(
            status,
            readyToReceivePayouts,
            payoutEnabled,
            normalizeValue(profile.getDlocalBeneficiaryFirstName()),
            normalizeValue(profile.getDlocalBeneficiaryLastName()),
            assessment.country(),
            normalizeValue(profile.getDlocalBeneficiaryDocumentType()),
            normalizeValue(profile.getDlocalBeneficiaryDocumentNumber()),
            normalizeValue(user.getEmail()),
            normalizeValue(user.getPhoneNumber()),
            normalizeValue(profile.getDlocalBankCode()),
            normalizeValue(profile.getDlocalBankAccountNumber()),
            normalizeValue(profile.getDlocalBankAccountType()),
            normalizeValue(profile.getDlocalBankBranch()),
            assessment.requiredFields(),
            assessment.missingFields(),
            assessment.invalidFields(),
            outstandingPaidBookingsCount > 0,
            outstandingPaidBookingsCount,
            splitCode,
            splitPaymentsEnabled
        );
    }

    private String resolveStatus(PayoutAssessment assessment, boolean payoutEnabled) {
        if (!assessment.invalidFields().isEmpty()) {
            return "ERROR";
        }
        if (!assessment.missingFields().isEmpty()) {
            return "INCOMPLETE";
        }
        if (!payoutEnabled) {
            return "ERROR";
        }
        return "READY";
    }

    private PayoutAssessment assess(ProfessionalProfile profile, User user) {
        String country = resolveCountry(profile);
        CountryRules countryRules = resolveCountryRules(country);

        Set<String> requiredFields = new LinkedHashSet<>(BASE_REQUIRED_FIELDS);
        if (countryRules.bankBranchRequired()) {
            requiredFields.add("branch");
        }

        List<String> missingFields = new ArrayList<>();
        List<String> invalidFields = new ArrayList<>();

        validateField("firstName", normalizeValue(profile.getDlocalBeneficiaryFirstName()), NAME_PATTERN, requiredFields, missingFields, invalidFields);
        validateField("lastName", normalizeValue(profile.getDlocalBeneficiaryLastName()), NAME_PATTERN, requiredFields, missingFields, invalidFields);
        validateField("country", country, COUNTRY_PATTERN, requiredFields, missingFields, invalidFields);
        validateField("documentType", normalizeValue(profile.getDlocalBeneficiaryDocumentType()), DOCUMENT_TYPE_PATTERN, requiredFields, missingFields, invalidFields);
        validateField("documentNumber", normalizeValue(profile.getDlocalBeneficiaryDocumentNumber()), DOCUMENT_NUMBER_PATTERN, requiredFields, missingFields, invalidFields);
        validateField("email", normalizeValue(user.getEmail()), EMAIL_PATTERN, requiredFields, missingFields, invalidFields);
        validateField("phone", normalizeValue(user.getPhoneNumber()), PHONE_PATTERN, requiredFields, missingFields, invalidFields);
        validateField("bank", normalizeValue(profile.getDlocalBankCode()), BANK_PATTERN, requiredFields, missingFields, invalidFields);
        validateField("accountNumber", normalizeValue(profile.getDlocalBankAccountNumber()), ACCOUNT_NUMBER_PATTERN, requiredFields, missingFields, invalidFields);
        validateField("accountType", normalizeValue(profile.getDlocalBankAccountType()), ACCOUNT_TYPE_PATTERN, requiredFields, missingFields, invalidFields);
        validateField("branch", normalizeValue(profile.getDlocalBankBranch()), BANK_PATTERN, requiredFields, missingFields, invalidFields);

        return new PayoutAssessment(
            country,
            List.copyOf(requiredFields),
            List.copyOf(missingFields),
            List.copyOf(invalidFields)
        );
    }

    private void validateField(
        String field,
        String value,
        Pattern pattern,
        Set<String> requiredFields,
        List<String> missingFields,
        List<String> invalidFields
    ) {
        boolean required = requiredFields.contains(field);
        if (value == null) {
            if (required) {
                missingFields.add(field);
            }
            return;
        }
        if (!pattern.matcher(value).matches()) {
            invalidFields.add(field);
        }
    }

    private CountryRules resolveCountryRules(String country) {
        return switch (country == null ? "" : country) {
            default -> new CountryRules(true);
        };
    }

    private String resolveCountry(ProfessionalProfile profile) {
        String payoutCountry = normalizeCountry(profile.getDlocalPayoutCountry());
        if (payoutCountry != null && COUNTRY_PATTERN.matcher(payoutCountry).matches()) {
            return payoutCountry;
        }

        String profileCountry = normalizeCountry(profile.getCountry());
        if (profileCountry != null && COUNTRY_PATTERN.matcher(profileCountry).matches()) {
            return profileCountry;
        }

        return normalizeCountry(billingProperties.getDlocal().getCountry());
    }

    private LoadedProfessional loadProfessional(String rawUserId) {
        Long userId = parseUserId(rawUserId);
        User user = userRepository.findByIdAndDeletedAtIsNull(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));

        if (user.getRole() != UserRole.PROFESSIONAL) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo profesionales");
        }

        ProfessionalProfile profile = professionalProfileRepository.findByUser_Id(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Perfil profesional no encontrado"));

        return new LoadedProfessional(user, profile);
    }

    private Long parseUserId(String rawUserId) {
        if (rawUserId == null || rawUserId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sin sesión activa");
        }
        try {
            return Long.parseLong(rawUserId.trim());
        } catch (NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identificador de usuario inválido");
        }
    }

    private String normalizeName(String value) {
        String normalized = normalizeValue(value);
        return normalized == null ? null : normalized.replaceAll("\\s{2,}", " ");
    }

    private String normalizeCountry(String value) {
        String normalized = normalizeValue(value);
        return normalized == null ? null : normalized.toUpperCase(Locale.ROOT);
    }

    private String normalizeUppercase(String value) {
        String normalized = normalizeValue(value);
        return normalized == null ? null : normalized.toUpperCase(Locale.ROOT);
    }

    private String normalizeSplitCode(String value) {
        return normalizeValue(value);
    }

    private String normalizeValue(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }

    private boolean sameValue(String currentValue, String nextValue) {
        return normalizeValue(currentValue) == null
            ? nextValue == null
            : normalizeValue(currentValue).equals(nextValue);
    }

    private record LoadedProfessional(User user, ProfessionalProfile profile) {}

    private record CountryRules(boolean bankBranchRequired) {}

    private record PayoutAssessment(
        String country,
        List<String> requiredFields,
        List<String> missingFields,
        List<String> invalidFields
    ) {
        boolean fieldsComplete() {
            return missingFields.isEmpty() && invalidFields.isEmpty();
        }
    }
}
