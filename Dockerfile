FROM denoland/deno:latest AS builder
WORKDIR /app
COPY deno.jsonc .
COPY src/ ./src/
COPY db/ ./db/
RUN deno install --entrypoint src/main.ts

FROM denoland/deno:latest
WORKDIR /app
COPY --from=builder /app .
EXPOSE 8000
CMD deno run --allow-net --allow-env --allow-read db/migrate.ts && deno run --allow-net --allow-env --allow-read src/main.ts