# Eventshuffle API

## Outline

- [Quick Start](#quick-start)
- [Running local manually](#running-local-manually)
  - [Requirements](#requirements)
  - [Setup](#setup)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [API Documentation](#api-documentation)
- [Development](#development)
  - [Available Tasks](#available-tasks)
  - [Database Migrations](#database-migrations)
- [Testing](#testing)
- [CI/CD](#cicd)
- [What I think could be improved](#what-i-think-could-be-improved)

## Quick Start

The fastest way to get up and running:

```bash
# Clone the repository
git clone git@github.com:lauri-ra/eventshuffle.git
cd eventshuffle

# Optional: seed the database with mock data
docker exec eventshuffle-api deno run --allow-net --allow-env --allow-read db/seed.ts

# Start the application
docker-compose up --build
```

The API will be available at `http://localhost:8000`

For a clean restart run:
```bash
docker-compose down -v
docker-compose up --build
```

## Running local manually

**Requirements**: Deno (2.0+) and PostgreSQL (v16+) for manual setup

### Setup

1. **Install Deno:**
   ```
   curl -fsSL https://deno.land/install.sh | sh
   ```

2. **Start PostgreSQL:**
   Make sure PostgreSQL is running locally on port 5432.

3. **Configure environment variables:**
   Copy and edit .env with your database credentials
   ```
   cp .env.example .env
   ```

4. **Run migrations:**
   ```
   deno task db:migrate
   ```

5. **Start the server:**
   ```
   deno task start
   ```

6. **Seed the database**
   ```
   deno task db:seed
   ```

## Project Structure

```
eventshuffle/
├── src/
│   ├── main.ts                 # App entry point
│   ├── config.ts               # Env configuration
│   ├── api/
│   │   └── event/
│   │       ├── event.routes.ts      # Route definitions & request validation
│   │       ├── event.controller.ts  # HTTP layer (request/response)
│   │       ├── event.service.ts     # Business logic & database queries
│   │       ├── event.types.ts       # Zod schemas & TypeScript types
│   │       └── event.test.ts        # Unit tests
│   └── common/
│       ├── logger.ts           # Logging utility class
│       ├── errorHandler.ts     # Global error handling middleware
│       └── errors.ts           # Custom classes for errors
├── db/
│   ├── db.ts                   # Drizzle database connection
│   ├── schema.ts               # Database table definitions
│   ├── migrate.ts              # Migration runner
│   ├── seed.ts                 # Test data seeder
│   └── migrations/             # Generated SQL migrations
├── .github/
│   └── workflows/
│       └── ci.yml              # CI/CD pipeline configuration
├── docker-compose.yml          # Docker orchestration
├── Dockerfile                  # Docker container config
├── deno.jsonc                  # Deno config & tasks
└── drizzle.config.ts           # Drizzle ORM config
```

## Tech Stack

Tech stack used for this project and some thoughts as to why I picked these tools for the job.

- **Deno**
  - Built in TypeScript support, no configs needed
  - Integrated tooling (linter, formatter, test runner)
  - Good native APIs
  - Secure by default

- **Hono**
  - Light and fast router
  - Great TypeScript support out of the box
  - Plug-n-play middleware (Zod validation, basic logging etc.)
  - Nice developer experience

- **PostgreSQL**
  - Using NoSQL would have also made sense. For the initial scale it felt like an attractive option, since it supports nested structures without complex relations. However PSQL seemed more future proof when thinking about scalability, especially when the application starts to get more complex.

- **Drizzle ORM**
  - Plays nicely with TypeScript
  - SQL like query syntax (easy to read, lots of control over queries)
  - Automagic migration generation from schema
  - Built in connection pooling

- **Zod**
  - Runtime type checking
  - Clear error messages
  - Works nicely with Hono with the `@hono/zod-validator` middleware

## API Documentation

All endpoints are prefixed with `/api/v1/event`.

### List All Events

```
curl http://localhost:8000/api/v1/event/list
```

**Response:**
```json
{
  "events": [
    {
      "id": 1,
      "name": "Jake's secret party"
    },
    {
      "id": 2,
      "name": "Bowling night"
    }
  ]
}
```

### Create an Event

```
curl -X POST http://localhost:8000/api/v1/event \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jake'\''s secret party",
    "dates": ["2014-01-01", "2014-01-05", "2014-01-12"]
  }'
```

**Response:**
```json
{
  "id": 1
}
```

### Show an Event

```
curl http://localhost:8000/api/v1/event/1
```

**Response:**
```json
{
  "id": 1,
  "name": "Jake's secret party",
  "dates": ["2014-01-01", "2014-01-05", "2014-01-12"],
  "votes": [
    {
      "date": "2014-01-01",
      "people": ["John", "Julia", "Paul", "Daisy"]
    }
  ]
}
```

### Add Votes to an Event


```
curl -X POST http://localhost:8000/api/v1/event/1/vote \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dick",
    "votes": ["2014-01-01", "2014-01-05"]
  }'
```

**Response:**
```json
{
  "id": 1,
  "name": "Jake's secret party",
  "dates": ["2014-01-01", "2014-01-05", "2014-01-12"],
  "votes": [
    {
      "date": "2014-01-01",
      "people": ["John", "Julia", "Paul", "Daisy", "Dick"]
    },
    {
      "date": "2014-01-05",
      "people": ["Dick"]
    }
  ]
}
```

### Show Event Results

```
curl http://localhost:8000/api/v1/event/1/results
```

**Response:**
```json
{
  "id": 1,
  "name": "Jake's secret party",
  "suitableDates": [
    {
      "date": "2014-01-01",
      "people": ["John", "Julia", "Paul", "Daisy", "Dick"]
    }
  ]
}
```

## Development

### Available Tasks

```bash
# Start development server
deno task start

# Run linter
deno task lint

# Run tests
deno task test

# Generate new migration from schema changes
deno task db:migrate

# Seed database with test data
deno task db:seed

# Run tests
deno task test
```

### Database Migrations

1. **Modify the schema** in [`db/schema.ts`](db/schema.ts)
2. **Generate migration:**
   ```bash
   deno task db:migrate
   ```
3. **Apply migration:** Migrations are automatically applied on startup

## Testing

The project has unit tests for the event API. They use the built-in Deno test runner and libraries. 
Tests are located next to their implementation files (eg. [`event.test.ts`](src/api/event/event.test.ts)).

Run the test suite with:

```bash
deno task test
```

## CI/CD

The project uses GitHub Actions for CI for verifying commits.
The pipeline sets up Postgres service container and Deno, then runs the linter and test suite.

The CI pipeline ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs on every push and pull request to the `main` branch.

## What I think could be improved

- **API Documentation** - Add OpenAPI/Swagger documentation, currently the API is just documented here in this README.
- **Improve tests** - Current tests only cover the "happy" paths
- **Improved validation** - More robust validation & handling of odd edge cases (eg. past dates, duplicate dates)
- **Optimising common queries** - Possibly indexing the db for commonly queried rows
- **Duplication** - There are some common patterns in [`event.service.ts`](src/api/event/event.service.ts) that could be moved into the shared util functions
- **Hot reload & Docker dev container** - Add development mode with file watching for faster iteration. Setup dev container.
- **Formatting Zod related errors better** - Standard error messages returned by Zod are not optimal for a clean API response