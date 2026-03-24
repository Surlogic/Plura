from pathlib import Path

controller = Path("backend-java/src/main/java/com/plura/plurabackend/core/auth/AuthController.java")
service = Path("backend-java/src/main/java/com/plura/plurabackend/core/auth/OtpChallengeService.java")

if not controller.exists():
    raise SystemExit(f"No existe {controller}")
if not service.exists():
    raise SystemExit(f"No existe {service}")

controller_text = controller.read_text(encoding="utf-8")
service_text = service.read_text(encoding="utf-8")

old_controller = """        otpChallengeService.verifyChallenge(
            activeAuthentication.getPrincipal().toString(),
            resolveAuthenticatedSessionId(activeAuthentication),
            request.getChallengeId(),
            request.getCode(),
            OtpChallengePurpose.ACCOUNT_DELETION,
            extractClientIp(httpRequest),
            httpRequest == null ? null : httpRequest.getHeader(\"User-Agent\")
        );
"""

new_controller = """        otpChallengeService.verifyChallengeOrAllowPreviouslyVerified(
            activeAuthentication.getPrincipal().toString(),
            resolveAuthenticatedSessionId(activeAuthentication),
            request.getChallengeId(),
            request.getCode(),
            OtpChallengePurpose.ACCOUNT_DELETION,
            extractClientIp(httpRequest),
            httpRequest == null ? null : httpRequest.getHeader(\"User-Agent\")
        );
"""

if old_controller not in controller_text:
    raise SystemExit("No se encontró el bloque esperado en AuthController.java")

controller_text = controller_text.replace(old_controller, new_controller, 1)
controller.write_text(controller_text, encoding="utf-8")

anchor = """    private User loadActiveUser(String rawUserId) {
"""

if anchor not in service_text:
    raise SystemExit("No se encontró el punto de inserción esperado en OtpChallengeService.java")

if "public void verifyChallengeOrAllowPreviouslyVerified(" in service_text:
    raise SystemExit("El método verifyChallengeOrAllowPreviouslyVerified ya existe. No se aplicó ningún cambio.")

insert_method = """
    @Transactional(noRollbackFor = AuthApiException.class)
    public void verifyChallengeOrAllowPreviouslyVerified(
        String rawUserId,
        String currentSessionId,
        String rawChallengeId,
        String rawCode,
        OtpChallengePurpose expectedPurpose,
        String ipAddress,
        String userAgent
    ) {
        User user = loadActiveUser(rawUserId);
        String challengeId = normalizeChallengeId(rawChallengeId);
        String normalizedCode = normalizeSubmittedCode(rawCode);
        LocalDateTime now = LocalDateTime.now();

        AuthOtpChallenge challenge = authOtpChallengeRepository.findByIdAndUser_Id(challengeId, user.getId())
            .orElseThrow(() -> auditFailure(
                user,
                currentSessionId,
                ipAddress,
                userAgent,
                HttpStatus.BAD_REQUEST,
                "CHALLENGE_INVALID",
                "Challenge inválido."
            ));

        if (expectedPurpose != null && challenge.getPurpose() != expectedPurpose) {
            throw auditFailure(user, currentSessionId, ipAddress, userAgent, HttpStatus.BAD_REQUEST, "CHALLENGE_INVALID", "Challenge inválido.");
        }
        if (challenge.getSessionId() != null && !challenge.getSessionId().isBlank()
            && (currentSessionId == null || !challenge.getSessionId().equals(currentSessionId))) {
            throw auditFailure(user, currentSessionId, ipAddress, userAgent, HttpStatus.BAD_REQUEST, "CHALLENGE_INVALID", "Challenge inválido.");
        }

        if (challenge.getConsumedAt() == null) {
            verifyChallenge(rawUserId, currentSessionId, rawChallengeId, rawCode, expectedPurpose, ipAddress, userAgent);
            return;
        }

        if (hasAttemptsExceeded(challenge)) {
            throw auditFailure(user, currentSessionId, ipAddress, userAgent, HttpStatus.BAD_REQUEST, "ATTEMPTS_EXCEEDED", "Superaste la cantidad máxima de intentos. Solicitá un nuevo código.");
        }
        if (challenge.getExpiresAt().isBefore(now)) {
            throw auditFailure(user, currentSessionId, ipAddress, userAgent, HttpStatus.BAD_REQUEST, "CHALLENGE_EXPIRED", "Challenge expirado.");
        }
        if (!hashCode(normalizedCode).equals(challenge.getCodeHash())) {
            throw auditFailure(user, currentSessionId, ipAddress, userAgent, HttpStatus.BAD_REQUEST, "CHALLENGE_INVALID", "Challenge inválido.");
        }
    }

"""

service_text = service_text.replace(anchor, insert_method + anchor, 1)
service.write_text(service_text, encoding="utf-8")

print(f"Fix aplicado en {controller}")
print(f"Fix aplicado en {service}")