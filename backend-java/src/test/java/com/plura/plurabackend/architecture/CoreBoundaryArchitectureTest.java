package com.plura.plurabackend.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

/**
 * Tests de arquitectura y limites entre paquetes.
 * Cubren escenarios de core boundary architecture para documentar el comportamiento esperado y evitar regresiones.
 * Mantener estos casos alineados con los contratos reales del backend cuando cambie la logica productiva.
 */
@AnalyzeClasses(
    packages = "com.plura.plurabackend",
    importOptions = {ImportOption.DoNotIncludeTests.class}
)
class CoreBoundaryArchitectureTest {

    /**
     * Regla de arquitectura: core auth no debe depender de professional repository.
     * Protege dependencias entre paquetes para sostener las fronteras del backend.
     */
    @ArchTest
    static final ArchRule core_auth_no_depends_on_professional_repository =
        noClasses()
            .that().resideInAPackage("..core.auth..")
            .should().dependOnClassesThat().resideInAnyPackage("..professional.repository..");

    /**
     * Regla de arquitectura: core billing no debe depender de professional repository.
     * Protege dependencias entre paquetes para sostener las fronteras del backend.
     */
    @ArchTest
    static final ArchRule core_billing_no_depends_on_professional_repository =
        noClasses()
            .that().resideInAPackage("..core.billing..")
            .should().dependOnClassesThat().resideInAnyPackage("..professional.repository..");

    /**
     * Regla de arquitectura: core billing models no debe depender de professional models.
     * Protege dependencias entre paquetes para sostener las fronteras del backend.
     */
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

    /**
     * Regla de arquitectura: core home availability search account no debe depender de professional repositories.
     * Protege dependencias entre paquetes para sostener las fronteras del backend.
     */
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

    /**
     * Regla de arquitectura: professional use cases no direct effective plan authorization.
     * Protege dependencias entre paquetes para sostener las fronteras del backend.
     */
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
