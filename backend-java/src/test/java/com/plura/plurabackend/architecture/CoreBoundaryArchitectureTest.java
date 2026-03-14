package com.plura.plurabackend.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

@AnalyzeClasses(
    packages = "com.plura.plurabackend",
    importOptions = {ImportOption.DoNotIncludeTests.class}
)
class CoreBoundaryArchitectureTest {

    @ArchTest
    static final ArchRule core_auth_no_depends_on_professional_repository =
        noClasses()
            .that().resideInAPackage("..core.auth..")
            .should().dependOnClassesThat().resideInAnyPackage("..professional.repository..");

    @ArchTest
    static final ArchRule core_billing_no_depends_on_professional_repository =
        noClasses()
            .that().resideInAPackage("..core.billing..")
            .should().dependOnClassesThat().resideInAnyPackage("..professional.repository..");

    @ArchTest
    static final ArchRule core_billing_models_no_depends_on_professional_models =
        noClasses()
            .that().resideInAnyPackage(
                "..core.billing.subscriptions.model..",
                "..core.billing.payments.model.."
            )
            .should().dependOnClassesThat().resideInAnyPackage(
                "..professional.model..",
                "..professional.service.model.."
            );

    @ArchTest
    static final ArchRule core_home_availability_search_account_no_depends_on_professional_repositories =
        noClasses()
            .that().resideInAnyPackage(
                "..core.home..",
                "..core.availability..",
                "..core.search..",
                "..core.account.."
            )
            .should().dependOnClassesThat().resideInAnyPackage(
                "..professional.repository..",
                "..professional.service.repository.."
            );

    @ArchTest
    static final ArchRule professional_use_cases_no_direct_effective_plan_authorization =
        noClasses()
            .that().resideInAnyPackage(
                "..professional.application..",
                "..professional.profile..",
                "..professional.payout..",
                "..professional.booking..",
                "..professional.schedule..",
                "..professional.analytics.."
            )
            .should().dependOnClassesThat().haveSimpleName("EffectiveProfessionalPlanService");
}
