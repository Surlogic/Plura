# Etapa 1: Construcción (Builder)
FROM eclipse-temurin:17-jdk-jammy AS builder
WORKDIR /app

# Copiamos los archivos necesarios de Gradle
COPY gradlew .
COPY gradle/ gradle/
COPY build.gradle settings.gradle ./

# Damos permisos de ejecución al wrapper de Gradle
RUN chmod +x ./gradlew

# Descargamos las dependencias para aprovechar el caché de capas de Docker
RUN ./gradlew dependencies --no-daemon || true

# Copiamos el código fuente de la aplicación
COPY src/ src/

# Compilamos el proyecto y generamos el .jar omitiendo los tests
RUN ./gradlew bootJar --no-daemon -x test

# Etapa 2: Ejecución (Runtime)
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Copiamos el .jar generado desde la etapa de construcción
COPY --from=builder /app/build/libs/*.jar app.jar

# El puerto configurado por defecto en application.yml es el 3000
EXPOSE 3000

# Ejecutamos la aplicación. 
# Usamos ${PORT} para que Render pueda inyectar dinámicamente su puerto (por defecto 10000)
ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT:-3000} -jar app.jar"]