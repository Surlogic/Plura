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
class NotificationArchitectureTest {

    @ArchTest
    static final ArchRule notification_core_no_depends_on_business_domains =
        noClasses()
            .that().resideInAnyPackage(
                "..core.notification.application..",
                "..core.notification.model..",
                "..core.notification.repository..",
                "..core.notification.query..",
                "..core.notification.inapp..",
                "..core.notification.metrics..",
                "..core.notification.dispatch..",
                "..core.notification.dedup.."
            )
            .should().dependOnClassesThat().resideInAnyPackage(
                "com.plura.plurabackend.professional..",
                "com.plura.plurabackend.usuario..",
                "com.plura.plurabackend.core.booking..",
                "com.plura.plurabackend.core.billing..",
                "com.plura.plurabackend.core.auth.."
            );

    @ArchTest
    static final ArchRule notification_email_core_no_depends_on_business_domains =
        noClasses()
            .that().resideInAPackage("..core.notification.email")
            .should().dependOnClassesThat().resideInAnyPackage(
                "com.plura.plurabackend.professional..",
                "com.plura.plurabackend.usuario..",
                "com.plura.plurabackend.core.booking..",
                "com.plura.plurabackend.core.billing..",
                "com.plura.plurabackend.core.auth.."
            );

    @ArchTest
    static final ArchRule notification_email_transport_only_reuses_auth_transport =
        noClasses()
            .that().resideInAPackage("..core.notification.email.transport..")
            .should().dependOnClassesThat().resideInAnyPackage(
                "com.plura.plurabackend.professional..",
                "com.plura.plurabackend.usuario..",
                "com.plura.plurabackend.core.booking..",
                "com.plura.plurabackend.core.billing.."
            );

    @ArchTest
    static final ArchRule notification_booking_integration_stays_out_of_unrelated_domains =
        noClasses()
            .that().resideInAPackage("..core.notification.integration.booking..")
            .should().dependOnClassesThat().resideInAnyPackage(
                "com.plura.plurabackend.professional..",
                "com.plura.plurabackend.usuario..",
                "com.plura.plurabackend.core.billing..",
                "com.plura.plurabackend.core.auth.."
            );

    @ArchTest
    static final ArchRule notification_billing_integration_stays_out_of_unrelated_domains =
        noClasses()
            .that().resideInAPackage("..core.notification.integration.billing..")
            .should().dependOnClassesThat().resideInAnyPackage(
                "com.plura.plurabackend.professional..",
                "com.plura.plurabackend.usuario..",
                "com.plura.plurabackend.core.auth.."
            );

    @ArchTest
    static final ArchRule booking_and_billing_do_not_send_notification_emails_directly =
        noClasses()
            .that().resideInAnyPackage(
                "..professional.booking..",
                "..core.booking..",
                "..core.billing.."
            )
            .should().dependOnClassesThat().resideInAnyPackage(
                "..core.notification.email..",
                "..core.notification.dispatch.."
            );
}
