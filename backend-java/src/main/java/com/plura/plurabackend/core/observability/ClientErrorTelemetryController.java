package com.plura.plurabackend.core.observability;

import com.plura.plurabackend.core.observability.dto.ClientErrorReportRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/telemetry/client-errors")
public class ClientErrorTelemetryController {

    private final AppErrorRecorder appErrorRecorder;

    public ClientErrorTelemetryController(AppErrorRecorder appErrorRecorder) {
        this.appErrorRecorder = appErrorRecorder;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void report(
        @Valid @RequestBody ClientErrorReportRequest request,
        HttpServletRequest servletRequest
    ) {
        appErrorRecorder.recordClientError(request, servletRequest);
    }
}
