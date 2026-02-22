# Plura Backend Java (Spring Boot)

Backend Java para Plura usando Spring Boot + Gradle. Se mantiene en paralelo al backend NestJS actual.

## Requisitos
- JDK 17
- PostgreSQL

## Variables de entorno
- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `JWT_SECRET`

## Cómo correr
```bash
./gradlew bootRun
```

## Swagger
Disponible en:
```
http://localhost:3000/swagger-ui.html
```

## Endpoints base
- `GET /health`
- `POST /auth/register`

## Notas
- Puerto por defecto: `3000`
- CORS permitido para `http://localhost:3002`
- Registro crea usuarios en `UserNormal`
