# Auditoria Tecnica Backend De Pagos - Mercado Pago Only

Fecha: `2026-03-19`

## Decision Vigente

Plura usa `Mercado Pago` como unico provider de pagos en backend.

La separacion de dominio vigente es:

- `Platform Subscriptions`: suscripciones mensuales de profesionales o empresas a Plura
- `Professional Mercado Pago Connection`: conexion OAuth de la cuenta Mercado Pago del profesional
- `Reservation Payments`: cobro de reservas del cliente al profesional o empresa
- `Reservation Refunds`: devoluciones por cancelacion segun politica de negocio
- `Provider Webhooks`: ingreso unico `Mercado Pago`, ruteado internamente por dominio
- `Internal Reconciliation / Audit`: ledger, operaciones e idempotencia para soporte

## Resumen Ejecutivo

Estado real confirmado en codigo:

1. `dLocal` ya no existe como provider operativo del backend.
2. Las reservas prepagas ya salen por Mercado Pago usando la conexion OAuth persistida del profesional.
3. Los refunds de reservas ya usan Mercado Pago.
4. Las suscripciones de plataforma siguen separadas en su propio flujo Mercado Pago.
5. `/webhooks/dlocal` fue eliminado; queda un unico ingreso `POST /webhooks/mercadopago`.
6. `PaymentProvider.DLOCAL` quedo solo como compatibilidad de lectura; el runtime rechaza ingresos nuevos `DLOCAL` y corta operaciones pendientes legacy como provider retirado.
7. Mobile ya no consume `/profesional/payout-config`; la superficie activa de cobros tambien quedo alineada al flujo `Mercado Pago only`.
8. La deuda tecnica principal ya no es el provider sino la concentracion de logica en `BookingProviderIntegrationService`.

## Estado Actual Por Dominio

### 1. Professional Mercado Pago Connection

Tabla:

- `professional_payment_provider_connection`

Clases principales:

- `backend-java/src/main/java/com/plura/plurabackend/core/billing/providerconnection/model/ProfessionalPaymentProviderConnection.java`
- `backend-java/src/main/java/com/plura/plurabackend/core/billing/providerconnection/repository/ProfessionalPaymentProviderConnectionRepository.java`
- `backend-java/src/main/java/com/plura/plurabackend/core/billing/providerconnection/ProfessionalPaymentProviderConnectionService.java`
- `backend-java/src/main/java/com/plura/plurabackend/core/billing/providerconnection/mercadopago/MercadoPagoOAuthClient.java`
- `backend-java/src/main/java/com/plura/plurabackend/core/billing/providerconnection/mercadopago/MercadoPagoOAuthStateService.java`
- `backend-java/src/main/java/com/plura/plurabackend/core/billing/providerconnection/security/MercadoPagoOAuthTokenCipher.java`
- `backend-java/src/main/java/com/plura/plurabackend/professional/paymentprovider/ProfessionalMercadoPagoConnectionController.java`

Endpoints:

- `GET /profesional/payment-providers/mercadopago/connection`
- `POST /profesional/payment-providers/mercadopago/oauth/start`
- `GET /profesional/payment-providers/mercadopago/oauth/callback`
- `DELETE /profesional/payment-providers/mercadopago/connection`

Estado:

- guarda `access_token` y `refresh_token` cifrados
- valida `state` firmado
- refresca access token al resolver la conexion del profesional
- no recicla configuracion legacy de payout

### 2. Platform Subscriptions

Clases principales:

- `backend-java/src/main/java/com/plura/plurabackend/core/billing/BillingController.java`
- `backend-java/src/main/java/com/plura/plurabackend/core/billing/BillingService.java`
- `backend-java/src/main/java/com/plura/plurabackend/core/billing/mercadopago/MercadoPagoSubscriptionService.java`
- `backend-java/src/main/java/com/plura/plurabackend/core/billing/mercadopago/MercadoPagoClient.java`

Endpoints:

- `POST /billing/checkout`
- `POST /billing/subscription`
- `GET /billing/subscription`
- `POST /billing/cancel`

Estado:

- se mantiene separado del dominio reserva
- usa `external_reference=subscription:{professionalId}`
- comparte provider pero no comparte flujo ni controller con reservas

### 3. Reservation Payments

Clases principales:

- `backend-java/src/main/java/com/plura/plurabackend/usuario/booking/BookingPaymentController.java`
- `backend-java/src/main/java/com/plura/plurabackend/core/billing/application/BookingPaymentApplicationService.java`
- `backend-java/src/main/java/com/plura/plurabackend/core/booking/finance/BookingProviderIntegrationService.java`
- `backend-java/src/main/java/com/plura/plurabackend/core/billing/payments/provider/MercadoPagoReservationPaymentProviderClient.java`
- `backend-java/src/main/java/com/plura/plurabackend/core/billing/providerconnection/ProfessionalPaymentProviderConnectionService.java`

Endpoint:

- `POST /cliente/reservas/{id}/payment-session`

Estado:

- solo acepta `MERCADOPAGO`
- crea una `preference` de Mercado Pago para la reserva
- usa el access token OAuth del profesional conectado
- persiste trazabilidad en `payment_transaction`, `payment_event` y `provider_operation`
- usa `external_reference=booking:{bookingId}` y metadata explicita para ruteo posterior

### 4. Reservation Refunds

Clases principales:

- `backend-java/src/main/java/com/plura/plurabackend/core/booking/finance/BookingFinanceService.java`
- `backend-java/src/main/java/com/plura/plurabackend/core/booking/finance/BookingProviderIntegrationService.java`
- `backend-java/src/main/java/com/plura/plurabackend/core/billing/payments/provider/MercadoPagoReservationPaymentProviderClient.java`

Estado:

- la decision de negocio de refund sigue viviendo en `BookingFinanceService`
- el adapter provider ahora ejecuta refund sobre Mercado Pago
- el refund queda trazado con `booking_refund_record` y `payment_transaction`
- los errores del PSP siguen quedando visibles para reconciliacion y reintento interno

### 5. Provider Webhooks

Clases principales:

- `backend-java/src/main/java/com/plura/plurabackend/core/billing/webhooks/BillingWebhookController.java`
- `backend-java/src/main/java/com/plura/plurabackend/core/billing/webhooks/BillingWebhookService.java`
- `backend-java/src/main/java/com/plura/plurabackend/core/billing/webhooks/WebhookEventProcessor.java`
- `backend-java/src/main/java/com/plura/plurabackend/core/billing/webhooks/WebhookEventDomain.java`

Endpoint:

- `POST /webhooks/mercadopago`

Estado:

- ya no existen webhooks de dLocal
- el ingreso es unico, pero el routing interno se separa por dominio
- usa `metadata.pluraDomain` y `external_reference` para distinguir `reservation` de `subscription`
- mantiene idempotencia con `payment_event`

### 6. Internal Reconciliation / Audit

Superficies reutilizadas:

- `payment_event`
- `payment_transaction`
- `provider_operation`
- `booking_financial_summary`
- `booking_refund_record`
- `BookingFinanceService`
- `InternalBookingOpsController`
- `InternalProviderOperationOpsController`

Estado:

- sigue siendo la base correcta para soporte, auditoria e idempotencia
- no conviene tocarla masivamente en esta fase

## Mapa De Endpoints Actuales Involucrados

### Billing de plataforma

- `POST /billing/checkout`
- `POST /billing/subscription`
- `GET /billing/subscription`
- `POST /billing/cancel`

### Conexion OAuth del profesional

- `GET /profesional/payment-providers/mercadopago/connection`
- `POST /profesional/payment-providers/mercadopago/oauth/start`
- `GET /profesional/payment-providers/mercadopago/oauth/callback`
- `DELETE /profesional/payment-providers/mercadopago/connection`

### Reservas y post-cobro

- `POST /cliente/reservas/{id}/payment-session`
- `POST /cliente/reservas/{id}/cancel`
- `POST /cliente/reservas/{id}/reschedule`
- `POST /profesional/reservas/{id}/cancel`
- `POST /profesional/reservas/{id}/reschedule`
- `POST /profesional/reservas/{id}/no-show`
- `POST /profesional/reservas/{id}/complete`

### Webhooks

- `POST /webhooks/mercadopago`

### Operacion interna

- `GET /internal/ops/provider-operations/alerts`
- `GET /internal/ops/bookings/alerts`
- `GET /internal/ops/bookings/{id}/detail`
- `POST /internal/ops/bookings/{id}/refund/retry`
- `POST /internal/ops/bookings/{id}/financial/recompute`
- `POST /internal/ops/bookings/{id}/reconcile`

## Lo Que Ya Sirve

- `BookingFinanceService` ya encapsula reglas de negocio de charge, refund y payout financiero
- `payment_event` ya da idempotencia y bitacora de webhooks
- `payment_transaction` ya da trazabilidad por booking, provider y estado
- `provider_operation` ya soporta ejecucion operativa y alertas internas
- la conexion OAuth del profesional ya existe y resuelve tokens frescos
- las suscripciones ya estaban separadas del dominio booking y siguen asi

## Riesgos Y Deuda Tecnica Actual

### 1. `BookingProviderIntegrationService` sigue demasiado concentrado

Hoy concentra:

- checkout
- verificacion
- refund
- payout financiero
- webhooks
- notificaciones
- conciliacion operativa

Esto no rompe la estrategia `Mercado Pago only`, pero hace mas dificil aislar cambios futuros.

### 2. Un solo webhook ingress exige disciplina de metadata

La separacion interna ahora depende de:

- `metadata.pluraDomain`
- `external_reference`

No es una heuristica fragil si esos campos se vuelven contrato obligatorio. Conviene tratarlo como regla dura del dominio.

### 3. Payout financiero sigue modelado en booking aunque ya no hay payout provider externo

Eso hoy se usa como evidencia contable de liquidacion marketplace, no como integracion PSP. Sirve mantenerlo por ahora para auditoria.

### 4. Queda deuda de naming en UI y contexto viejo

El backend ya no expone `/profesional/payout-config`; web y mobile ya quedaron alineados al flujo `Mercado Pago only`, pero cualquier doc residual que lo mencione queda obsoleta.

## Elementos dLocal Eliminados En Esta Fase

### Controllers y endpoints

- `POST /webhooks/dlocal`
- `GET /profesional/payout-config`
- `PUT /profesional/payout-config`
- `POST /profesional/reservas/{id}/payout/retry`
- `POST /internal/ops/bookings/{id}/payout/retry`

### Services y adapters

- `backend-java/src/main/java/com/plura/plurabackend/core/billing/payments/provider/DLocalPaymentProviderClient.java`
- `backend-java/src/main/java/com/plura/plurabackend/core/billing/webhooks/signature/DLocalWebhookSignatureVerifier.java`
- `backend-java/src/main/java/com/plura/plurabackend/professional/payout/ProfessionalPayoutConfigService.java`
- `backend-java/src/main/java/com/plura/plurabackend/core/billing/application/BookingPayoutApplicationService.java`

### DTOs legacy

- `backend-java/src/main/java/com/plura/plurabackend/professional/dto/ProfessionalPayoutConfigResponse.java`
- `backend-java/src/main/java/com/plura/plurabackend/professional/dto/ProfessionalPayoutConfigUpdateRequest.java`
- `apps/mobile/src/types/payout.ts`

### Configuracion y compatibilidad

- bloque `billing.dlocal.*` en `application.yml`
- compatibilidad legacy en `PluraBackendApplication`
- `PaymentProvider.DLOCAL`

### Campos de dominio

- `dlocal_*` en `professional_profile`
- `ProfessionalProfile` ya no guarda split code ni payout data legacy

### Branches de runtime

- parsing y dispatch de dLocal en `BillingWebhookService`
- ramas legacy de `BookingProviderIntegrationService` que resolvian dLocal como provider de reservas

## Restos Historicos Que Se Conservan

No son runtime activo. Se conservan por historia de schema y trazabilidad de Flyway:

- `V34__dlocal_booking_payout_pilot.sql`
- `V37__dlocal_go_split_code.sql`
- `V47__remove_dlocal_legacy.sql`

La regla es:

- no reusar esas migraciones
- no documentarlas como capacidad vigente
- mantenerlas solo porque Flyway ya las versiona

## Inventario Final De dLocal

- runtime activo: eliminado; no existe webhook `dlocal`, no hay adapter ni verifier activos y el runtime rechaza ingresos nuevos `DLOCAL`
- compatibilidad legacy: `PaymentProvider.DLOCAL` queda solo para leer filas historicas y para reconducir pendientes viejos sin reactivar dLocal
- historia de schema: `V34__dlocal_booking_payout_pilot.sql`, `V37__dlocal_go_split_code.sql` y `V47__remove_dlocal_legacy.sql` se preservan solo por historia Flyway

## Arquitectura Objetivo Minima Que Queda Preparada

### Professional Mercado Pago Connection

- storage propio de tokens y estado
- refresh token automatizado
- controllers propios bajo `/profesional/payment-providers/mercadopago/*`

### Reservation Payments

- checkout de reserva via `MercadoPagoReservationPaymentProviderClient`
- seller OAuth token resuelto por profesional
- `external_reference=booking:{id}`
- metadata obligatoria con `pluraDomain=reservation`

### Reservation Refunds

- refund provider sobre Mercado Pago
- decision de negocio y calculo reutilizados
- estados y errores persistidos para soporte

### Platform Subscriptions

- siguen en `BillingService` + `MercadoPagoSubscriptionService`
- `external_reference=subscription:{professionalId}`
- no compartir adapter de reservas

### Provider Webhooks

- unico endpoint `/webhooks/mercadopago`
- routing interno por dominio
- idempotencia sobre `payment_event`

### Internal Reconciliation / Audit

- mantener `payment_event`, `payment_transaction`, `provider_operation`
- mantener `BookingFinanceService`
- no simplificar esto antes de estabilizar pagos reales

## Orden Recomendado De Trabajo Siguiente

1. Extraer gradualmente servicios mas chicos desde `BookingProviderIntegrationService`:
   - `ReservationPaymentService`
   - `ReservationRefundService`
   - `ReservationWebhookService`
2. Endurecer contrato de metadata de Mercado Pago:
   - `pluraDomain`
   - `bookingId`
   - `professionalId`
   - `transactionId`
3. Agregar tests de integracion mas amplios para refund pendiente, fallo de refund y refresh expirado de OAuth.
4. Limpiar cualquier UI o cliente SDK que todavia intente usar payout config legacy.

## Verificacion Ejecutada

Comandos ejecutados:

```bash
./gradlew compileJava testClasses
./gradlew test --tests "com.plura.plurabackend.billing.providerconnection.ProfessionalPaymentProviderConnectionServiceTest" --tests "com.plura.plurabackend.booking.BookingProviderIntegrationServiceTest" --tests "com.plura.plurabackend.core.billing.webhooks.BillingWebhookIdempotencyIntegrationTest"
```

Cobertura validada en esta fase:

- OAuth Mercado Pago profesional
- `payment-session` de reservas con Mercado Pago
- webhook reservation Mercado Pago
- refund de reserva con Mercado Pago
