FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
COPY maven-settings.xml .
COPY .mvn ./.mvn
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B package -DskipTests
FROM eclipse-temurin:21-jre-jammy
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* && useradd -m novara
WORKDIR /app
RUN mkdir uploads && chown novara:novara uploads
COPY --from=build /build/target/novara-api-1.0.0.jar app.jar
USER novara
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
