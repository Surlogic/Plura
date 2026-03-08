package com.plura.plurabackend.auth;

import com.plura.plurabackend.auth.model.OtpChallengePurpose;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class PluraEmailTemplateService {

    private final String brandName;
    private final String publicWebUrl;

    public PluraEmailTemplateService(
        @Value("${app.email.brand-name:Plura}") String brandName,
        @Value("${app.email.public-web-url:http://localhost:3002}") String publicWebUrl
    ) {
        this.brandName = normalizeBrandName(brandName);
        this.publicWebUrl = normalizeBaseUrl(publicWebUrl);
    }

    public TransactionalEmailService.TransactionalEmailMessage buildPasswordResetEmail(
        String toAddress,
        String recipientName,
        String resetUrl,
        long expiresInMinutes
    ) {
        String safeName = greetingName(recipientName);
        String safeUrl = escapeHtml(resetUrl);
        String subject = "Restablece tu contraseña en " + brandName;
        String title = "Restablece tu contraseña";
        String intro = "Recibimos una solicitud para restablecer la contraseña de tu cuenta.";
        String body = "Usa el siguiente botón para elegir una nueva contraseña de forma segura.";
        String securityNote = "Si no solicitaste este cambio, puedes ignorar este mensaje.";
        String expiry = "Este enlace expira en " + expiresInMinutes + " minutos.";
        String button = buttonHtml("Restablecer contraseña", safeUrl);
        String html = wrapHtml(
            title,
            """
            <p style="margin:0 0 16px 0;color:#1f2937;font-size:15px;line-height:1.6;">Hola %s,</p>
            <p style="margin:0 0 12px 0;color:#475569;font-size:15px;line-height:1.6;">%s</p>
            <p style="margin:0 0 24px 0;color:#475569;font-size:15px;line-height:1.6;">%s</p>
            %s
            <p style="margin:24px 0 10px 0;color:#475569;font-size:14px;line-height:1.6;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
            <p style="margin:0 0 18px 0;word-break:break-all;"><a href="%s" style="color:#0f766e;text-decoration:none;">%s</a></p>
            <p style="margin:0 0 10px 0;color:#111827;font-size:14px;line-height:1.6;font-weight:600;">%s</p>
            <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">%s</p>
            """.formatted(
                escapeHtml(safeName),
                escapeHtml(intro),
                escapeHtml(body),
                button,
                safeUrl,
                safeUrl,
                escapeHtml(expiry),
                escapeHtml(securityNote)
            )
        );
        String text = """
            %s

            Hola %s,

            %s
            %s

            Restablece tu contraseña aquí:
            %s

            %s
            %s
            """.formatted(title, safeName, intro, body, resetUrl, expiry, securityNote).trim();
        return new TransactionalEmailService.TransactionalEmailMessage(
            "password_reset",
            toAddress,
            safeName,
            subject,
            html,
            text
        );
    }

    public TransactionalEmailService.TransactionalEmailMessage buildEmailVerificationEmail(
        String toAddress,
        String recipientName,
        String code,
        long expiresInMinutes
    ) {
        String safeName = greetingName(recipientName);
        String safeCode = escapeHtml(code);
        String subject = "Tu código de verificación de " + brandName;
        String title = "Verifica tu email";
        String html = wrapHtml(
            title,
            """
            <p style="margin:0 0 16px 0;color:#1f2937;font-size:15px;line-height:1.6;">Hola %s,</p>
            <p style="margin:0 0 20px 0;color:#475569;font-size:15px;line-height:1.6;">Usa este código para verificar el email de tu cuenta en %s.</p>
            %s
            <p style="margin:22px 0 10px 0;color:#111827;font-size:14px;line-height:1.6;font-weight:600;">Este código expira en %d minutos.</p>
            <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">Si no solicitaste esta verificación, puedes ignorar este mensaje.</p>
            """.formatted(
                escapeHtml(safeName),
                escapeHtml(brandName),
                codeBlockHtml(safeCode),
                expiresInMinutes
            )
        );
        String text = """
            %s

            Hola %s,

            Usa este código para verificar el email de tu cuenta en %s:

            %s

            Este código expira en %d minutos.
            Si no solicitaste esta verificación, puedes ignorar este mensaje.
            """.formatted(title, safeName, brandName, code, expiresInMinutes).trim();
        return new TransactionalEmailService.TransactionalEmailMessage(
            "email_verification",
            toAddress,
            safeName,
            subject,
            html,
            text
        );
    }

    public TransactionalEmailService.TransactionalEmailMessage buildOtpChallengeEmail(
        String toAddress,
        String recipientName,
        OtpChallengePurpose purpose,
        String code,
        long expiresInMinutes
    ) {
        String safeName = greetingName(recipientName);
        String purposeLabel = describePurpose(purpose);
        String safeCode = escapeHtml(code);
        String subject = "Código de seguridad de " + brandName;
        String title = "Confirma una acción sensible";
        String html = wrapHtml(
            title,
            """
            <p style="margin:0 0 16px 0;color:#1f2937;font-size:15px;line-height:1.6;">Hola %s,</p>
            <p style="margin:0 0 20px 0;color:#475569;font-size:15px;line-height:1.6;">Introduce este código para confirmar %s.</p>
            %s
            <p style="margin:22px 0 10px 0;color:#111827;font-size:14px;line-height:1.6;font-weight:600;">Este código expira en %d minutos.</p>
            <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">Si no reconoces esta solicitud, ignora este correo y revisa la seguridad de tu cuenta.</p>
            """.formatted(
                escapeHtml(safeName),
                escapeHtml(purposeLabel),
                codeBlockHtml(safeCode),
                expiresInMinutes
            )
        );
        String text = """
            %s

            Hola %s,

            Usa este código para confirmar %s:

            %s

            Este código expira en %d minutos.
            Si no reconoces esta solicitud, ignora este correo y revisa la seguridad de tu cuenta.
            """.formatted(title, safeName, purposeLabel, code, expiresInMinutes).trim();
        return new TransactionalEmailService.TransactionalEmailMessage(
            "otp_challenge",
            toAddress,
            safeName,
            subject,
            html,
            text
        );
    }

    private String wrapHtml(String title, String bodyHtml) {
        return """
            <!doctype html>
            <html lang="es">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>%s</title>
              </head>
              <body style="margin:0;padding:24px;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
                <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <tr>
                    <td align="center">
                      <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:640px;border-collapse:collapse;">
                        <tr>
                          <td style="padding:0 0 18px 0;text-align:center;">
                            <div style="display:inline-block;font-size:22px;font-weight:700;letter-spacing:0.04em;color:#0f172a;">%s</div>
                          </td>
                        </tr>
                        <tr>
                          <td style="background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;padding:36px 32px;box-shadow:0 12px 30px rgba(15,23,42,0.06);">
                            <h1 style="margin:0 0 18px 0;font-size:28px;line-height:1.15;color:#0f172a;">%s</h1>
                            %s
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:18px 12px 0 12px;text-align:center;color:#64748b;font-size:12px;line-height:1.6;">
                            <p style="margin:0 0 8px 0;">Mensaje transaccional de seguridad enviado por %s.</p>
                            <p style="margin:0;">%s</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
            """.formatted(
            escapeHtml(title),
            escapeHtml(brandName),
            escapeHtml(title),
            bodyHtml,
            escapeHtml(brandName),
            escapeHtml(publicWebUrl)
        );
    }

    private String buttonHtml(String label, String url) {
        return """
            <div style="margin:0 0 12px 0;">
              <a href="%s" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:999px;font-size:15px;font-weight:700;">%s</a>
            </div>
            """.formatted(url, escapeHtml(label));
    }

    private String codeBlockHtml(String code) {
        return """
            <div style="margin:0 0 8px 0;padding:18px 20px;border-radius:16px;background:#f8fafc;border:1px solid #dbe4ee;text-align:center;">
              <div style="font-size:32px;line-height:1;letter-spacing:0.24em;font-weight:700;color:#0f172a;">%s</div>
            </div>
            """.formatted(code);
    }

    private String describePurpose(OtpChallengePurpose purpose) {
        if (purpose == null) {
            return "una acción sensible en tu cuenta";
        }
        return switch (purpose) {
            case ACCOUNT_DELETION -> "la eliminación de tu cuenta";
            case PASSWORD_CHANGE -> "el cambio de tu contraseña";
        };
    }

    private String greetingName(String recipientName) {
        if (recipientName == null || recipientName.trim().isBlank()) {
            return "equipo";
        }
        return recipientName.trim();
    }

    private String normalizeBrandName(String value) {
        if (value == null || value.trim().isBlank()) {
            return "Plura";
        }
        return value.trim();
    }

    private String normalizeBaseUrl(String value) {
        if (value == null || value.trim().isBlank()) {
            return "http://localhost:3002";
        }
        return value.trim();
    }

    private String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#39;");
    }
}
