# ── 빌드 단계 ──
FROM gradle:8.10-jdk21 AS build
WORKDIR /src
COPY . .
RUN gradle fatJar --no-daemon -q

# ── 실행 단계 ──
FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 1001 momcare && mkdir -p /app/data && chown momcare /app/data
COPY --from=build /src/build/libs/*-all.jar /app/server.jar
USER momcare
ENV PORT=8080
EXPOSE 8080
CMD ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/server.jar"]
