# Backend Java

## Timezone del sistema (MVP)
- Zona fija: `APP_TIMEZONE` (default `America/Montevideo`).
- Endpoint de slots y creación de reservas usan esta zona para:
  - calcular "horas pasadas";
  - validar fecha futura;
  - interpretar `startDateTime` recibido.
- Recomendación de contrato frontend:
  - enviar `date` como `YYYY-MM-DD` para slots;
  - enviar `startDateTime` en ISO (`YYYY-MM-DDTHH:mm` o con offset, ej. `2026-02-27T13:00:00Z`).
