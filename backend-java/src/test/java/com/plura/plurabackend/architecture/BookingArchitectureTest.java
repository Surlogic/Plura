package com.plura.plurabackend.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

/**
 * Tests de arquitectura y limites entre paquetes.
 * Cubren escenarios de reserva architecture para documentar el comportamiento esperado y evitar regresiones.
 * Mantener estos casos alineados con los contratos reales del backend cuando cambie la logica productiva.
 */
@AnalyzeClasses(
    packages = "com.plura.plurabackend",
    importOptions = {ImportOption.DoNotIncludeTests.class}
)
class BookingArchitectureTest {

    /**
     * Regla de arquitectura: usuario booking no debe depender de professional.
     * Protege dependencias entre paquetes para sostener las fronteras del backend.
     */
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

    /**
     * Regla de arquitectura: professional booking no debe depender de usuario.
     * Protege dependencias entre paquetes para sostener las fronteras del backend.
     */
    @ArchTest
    static final ArchRule professional_booking_no_depends_on_usuario =
        noClasses()
            .that().resideInAPackage("..professional.booking..")
            .should().dependOnClassesThat().resideInAnyPackage("..usuario..");

    /**
     * Regla de arquitectura: core booking no debe depender de actor booking packages.
     * Protege dependencias entre paquetes para sostener las fronteras del backend.
     */
    @ArchTest
    static final ArchRule core_booking_no_depends_on_actor_booking_packages =
        noClasses()
            .that().resideInAPackage("..core.booking..")
            .should().dependOnClassesThat().resideInAnyPackage("..usuario.booking..", "..professional.booking..");

    /**
     * Regla de arquitectura: core booking models no debe depender de professional models.
     * Protege dependencias entre paquetes para sostener las fronteras del backend.
     */
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
