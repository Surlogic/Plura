package com.plura.plurabackend.professional.worker.dashboard;

import com.plura.plurabackend.core.booking.dto.ProfessionalBookingResponse;
import com.plura.plurabackend.core.booking.repository.BookingRepository;
import com.plura.plurabackend.core.security.CurrentActorService;
import com.plura.plurabackend.professional.worker.dto.WorkerDashboardSummaryResponse;
import com.plura.plurabackend.professional.worker.model.ProfessionalWorker;
import com.plura.plurabackend.professional.worker.model.ProfessionalWorkerStatus;
import com.plura.plurabackend.professional.worker.repository.ProfessionalWorkerRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * WorkerDashboardController es un controlador REST del modulo profesionales / trabajadores / dashboard.
 * Responsabilidad: recibir requests HTTP, validar acceso basico y delegar la operacion al servicio de aplicacion o dominio.
 * Superficie HTTP: atiende rutas bajo /trabajador y deja la logica pesada en servicios.
 * Foco funcional: trabajadores.
 */
@RestController
@RequestMapping("/trabajador")
public class WorkerDashboardController {

    private final CurrentActorService currentActorService;
    private final ProfessionalWorkerRepository workerRepository;
    private final BookingRepository bookingRepository;

    public WorkerDashboardController(
        CurrentActorService currentActorService,
        ProfessionalWorkerRepository workerRepository,
        BookingRepository bookingRepository
    ) {
        this.currentActorService = currentActorService;
        this.workerRepository = workerRepository;
        this.bookingRepository = bookingRepository;
    }

    /**
     * Devuelve los datos del trabajador autenticado en el contexto actual.
     */
    @GetMapping("/me")
    public WorkerDashboardSummaryResponse me() {
        ProfessionalWorker worker = loadCurrentWorker();
        return new WorkerDashboardSummaryResponse(
            String.valueOf(worker.getId()),
            worker.getDisplayName(),
            worker.getEmail(),
            worker.getStatus().name(),
            worker.getProfessional() == null || worker.getProfessional().getId() == null
                ? null
                : String.valueOf(worker.getProfessional().getId()),
            worker.getProfessional() == null ? null : worker.getProfessional().getDisplayName(),
            worker.getProfessional() == null ? null : worker.getProfessional().getSlug()
        );
    }

    /**
     * Devuelve reservas del trabajador o profesional segun filtros de fecha.
     */
    @GetMapping("/reservas")
    public List<ProfessionalBookingResponse> bookings(
        @RequestParam(required = false) String date,
        @RequestParam(required = false) String dateFrom,
        @RequestParam(required = false) String dateTo
    ) {
        ProfessionalWorker worker = loadCurrentWorker();
        LocalDate from;
        LocalDate to;
        if (date != null && !date.isBlank()) {
            if ((dateFrom != null && !dateFrom.isBlank()) || (dateTo != null && !dateTo.isBlank())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Usá date o dateFrom/dateTo, pero no ambos");
            }
            from = parseDate(date);
            to = from;
        } else if (dateFrom != null && !dateFrom.isBlank() && dateTo != null && !dateTo.isBlank()) {
            from = parseDate(dateFrom);
            to = parseDate(dateTo);
        } else {
            from = LocalDate.now();
            to = from.plusDays(30);
        }
        if (to.isBefore(from)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rango de fechas inválido");
        }
        LocalDateTime start = from.atStartOfDay();
        LocalDateTime end = to.atTime(LocalTime.MAX);
        return bookingRepository.findWorkerBookingResponsesByWorkerIdAndStartDateTimeBetween(
            worker.getId(),
            start,
            end
        );
    }

    /**
     * Devuelve eventos de calendario en el rango solicitado.
     */
    @GetMapping("/calendario")
    public List<ProfessionalBookingResponse> calendar(
    /**
     * Carga y arma la seccion current worker a partir de datos persistidos o consultas agregadas.
     */
        @RequestParam(required = false) String dateFrom,
        @RequestParam(required = false) String dateTo
    ) {
        return bookings(null, dateFrom, dateTo);
    }

    private ProfessionalWorker loadCurrentWorker() {
        Long workerId = currentActorService.currentWorkerId();
        ProfessionalWorker worker = workerRepository.findById(workerId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trabajador no encontrado"));
        if (worker.getStatus() != ProfessionalWorkerStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Trabajador inactivo");
        }
        return worker;
    }

    /**
     * Parsea fecha y convierte errores de formato en errores controlados.
     */
    private LocalDate parseDate(String value) {
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fecha inválida");
        }
    }
}
