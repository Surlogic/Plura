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
class BookingArchitectureTest {

    @ArchTest
    static final ArchRule usuario_booking_no_depends_on_professional =
        noClasses()
            .that().resideInAPackage("..usuario.booking..")
            .should().dependOnClassesThat().resideInAnyPackage(
                "..professional.booking..",
                "..professional.profile..",
                "..professional.application..",
                "..professional.model..",
                "..professional.service.model.."
            );

    @ArchTest
    static final ArchRule professional_booking_no_depends_on_usuario =
        noClasses()
            .that().resideInAPackage("..professional.booking..")
            .should().dependOnClassesThat().resideInAnyPackage("..usuario..");

    @ArchTest
    static final ArchRule core_booking_no_depends_on_actor_booking_packages =
        noClasses()
            .that().resideInAPackage("..core.booking..")
            .should().dependOnClassesThat().resideInAnyPackage("..usuario.booking..", "..professional.booking..");

    @ArchTest
    static final ArchRule core_booking_models_no_depends_on_professional_models =
        noClasses()
            .that().resideInAnyPackage(
                "..core.booking.model..",
                "..core.booking.policy.model..",
                "..core.booking.finance.model.."
            )
            .should().dependOnClassesThat().resideInAnyPackage(
                "..professional.model..",
                "..professional.service.model.."
            );
}
