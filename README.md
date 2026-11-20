# NOVARA · Commerce + Order Management

A fictional electronics retailer with two separate React applications and a shared Java 21 / Spring Boot REST API backed by MySQL 8.4. Browse and buy in the storefront, then fulfill the same database-backed order in the internal OMS.

The supplied `insp/inspiration.png` informs both interfaces: navy header, a pale gray workspace, white panels, compact typography, teal data and restrained lavender accents. All application source is Java or JavaScript; no TypeScript.

## Local applications

| Application  | URL                                   |
| ------------ | ------------------------------------- |
| Storefront   | http://localhost:5174                 |
| OMS          | http://localhost:5175                 |
| REST API     | http://localhost:8081/api             |
| Swagger UI   | http://localhost:8081/swagger-ui.html |
| OpenAPI JSON | http://localhost:8081/v3/api-docs     |
| Health       | http://localhost:8081/actuator/health |
| MySQL        | `127.0.0.1:3307`, database `novara`   |

Ports intentionally avoid the other applications already running on 8080 and 5173.

## Demo accounts

When `DEMO_SEED=true`, the first startup on an empty database creates these accounts. Their password is the configured `DEMO_PASSWORD`; the supplied local environment uses **`NovaraDemo!2026`**.

| Role     | Email                  | Sign in at |
| -------- | ---------------------- | ---------- |
| Admin    | `admin@novara.demo`    | OMS        |
| Manager  | `manager@novara.demo`  | OMS        |
| Staff    | `staff@novara.demo`    | OMS        |
| Customer | `customer@novara.demo` | Storefront |

The seed includes 12 electronics products, six categories, eight fictional customers, 30 orders spread across 30 days, payments, shipments, order activity, and inventory movements. Browser tests create additional clearly named demo records. Seed data is not reinserted when the database already contains users.

## Start and stop

Run commands from `D:\E-commerce\OMS` in PowerShell.

### Full Docker system

Docker Desktop is the only runtime prerequisite for this mode. The backend and frontends build inside their containers.

```powershell
# If native development servers are running, stop them first:
.\scripts\stop-dev.ps1

docker compose up -d --build --wait
docker compose ps
docker compose logs -f backend

# Stop all services, keep data and uploaded images:
docker compose stop

# Start them again without rebuilding:
docker compose start

# Remove containers/network, keep named volumes:
docker compose down
```

Do not add `-v` to `docker compose down` unless you intend to delete the databases and uploaded images. MySQL and uploads use separate persistent named volumes. Only loopback interfaces are exposed.

### Native development + Docker MySQL

Prerequisites: Java 21, Maven 3.9+, Node 24 LTS, npm, Git, and Docker Desktop. The scripts locate Java 21 under common Windows install directories; this machine has it at `C:\Program Files\Eclipse Adoptium\jdk-21.0.13.9-hotspot`. The default `java` on PATH is Java 17, so use the scripts or set `JAVA_HOME` explicitly.

```powershell
# Stop the containerized API/frontends if switching from full Docker:
docker compose stop backend storefront admin

# Install locked npm dependencies, build backend, start MySQL and all three apps:
.\scripts\start-dev.ps1

# Start existing builds without reinstalling/rebuilding:
.\scripts\start-dev.ps1 -SkipBuild

# Stop only the three native app processes managed by this project:
.\scripts\stop-dev.ps1

# Optionally stop MySQL as well:
docker compose stop db
```

Development logs and process IDs live in `.runtime/`. The start script stops its backend before rebuilding because Windows keeps the running JAR open. Do not run `mvn package` against a running copy of the target JAR.

Manual terminals, if preferred:

```powershell
# Terminal 1, project root:
docker compose up -d db
. .\scripts\env.ps1
cd backend
mvn -s maven-settings.xml -gs maven-settings.xml spring-boot:run

# Terminal 2, project root:
npm run dev:storefront

# Terminal 3, project root:
npm run dev:admin
```

The project-local Maven settings use HTTPS Maven Central. They avoid a nonresponsive global HTTP mirror on this machine and do not modify global Maven configuration.

## Environment

A local ignored `.env` has been created with random database and JWT secrets. On a fresh checkout:

```powershell
Copy-Item .env.example .env
# Replace MYSQL_PASSWORD, MYSQL_ROOT_PASSWORD and JWT_SECRET in .env.
# JWT_SECRET must contain at least 64 characters.
```

`DEMO_SEED=true` requires a `DEMO_PASSWORD` of at least 10 characters. Set `DEMO_SEED=false` outside a demonstration environment. Database credentials cannot be changed merely by editing `.env` after the MySQL volume has initialized; update the database account deliberately as well.

Native defaults: MySQL `localhost:3307`, API `8081`. Docker backend uses `db:3306`. Vite and Nginx proxy `/api` and `/media` to Spring, so the frontends share neither memory nor business state. For a separately hosted frontend, set `VITE_API_URL` at build time and configure `CORS_ORIGINS` on the backend.

## Features

- Storefront catalog, category and price filters, sorting, search, pagination, product galleries and stock indicators.
- Persistent shopping bag containing only IDs and quantities; live prices and stock always come from the API.
- Registration, BCrypt passwords, signed JWT access tokens, rotating refresh tokens, database session revocation, logout, profile and shipping history.
- Transactional checkout with server totals, sorted pessimistic stock locks, idempotency, simulated card success/decline and cash on delivery.
- Customer order history, tracking, payment retry and eligible cancellation.
- OMS order filtering by customer/order/date/status/payment, sorting, pagination, details and validated fulfillment actions.
- Product/category management, image uploads, deactivation, inventory adjustments and movement history.
- Customers, payment history, shipment creation and progression, database-derived sales analytics, admin-only team access management.
- OpenAPI, Flyway migration, database constraints, DTO validation, consistent error responses and backend-enforced roles.

## Important business rules

Prices use `BigDecimal` / `DECIMAL(12,2)`. The server ignores no client totals: unknown checkout fields, including supplied prices/totals, are rejected. Shipping is $9.95 below $100, otherwise free. This demo has no additional tax.

Successful card orders and COD orders deduct available stock immediately. Declined card orders are saved with `FAILED` payment and do not reserve inventory. A successful retry must acquire stock again. Cancellation restores allocated stock exactly once; paid orders get a simulated refund. COD is marked paid only on delivery.

Fulfillment follows `PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED`. A processing order needs a shipment before dispatch. Customers can cancel pending/confirmed orders; managers/admins can also cancel processing orders. Shipped, delivered, and cancelled orders cannot be advanced arbitrarily.

## Test and build

```powershell
# Uses the real MySQL novara_test database, never the storefront database:
.\scripts\test-backend.ps1

# Build both JavaScript applications:
npm run build

# With API and both frontends running; uses installed Google Chrome:
npm run test:e2e

# Inspect retained traces/report after failure:
npx playwright show-report
```

The MySQL init script creates `novara_test` and grants the development user access on first initialization. If using an existing external MySQL environment, create a dedicated test database and set `TEST_DB_URL`. Do not point tests at a production database. Backend integration tests add isolated records with random identifiers and can be rerun without clearing the database.

See [docs/TESTING.md](docs/TESTING.md) for verified results and scope.

## Structure

```text
OMS/
├── insp/                     original design reference
├── backend/
│   ├── src/main/java/com/novara/
│   │   ├── api/              controllers, request/response DTOs, errors
│   │   ├── domain/           JPA model and repositories
│   │   ├── security/         JWT sessions, Spring Security, OpenAPI
│   │   └── service/          commerce rules, analytics, demo seed, images
│   ├── src/main/resources/   Flyway schema, config, seed and local media
│   └── src/test/             JUnit, Mockito and MySQL/MockMvc tests
├── frontend/
│   ├── storefront/          separate customer Vite application
│   ├── admin/               separate OMS Vite application
│   └── shared/              design tokens, components, Axios and auth
├── scripts/                  start/stop/test and asset helpers
├── tests/                    Playwright browser workflows and responsive checks
├── docs/                     architecture, ERD, API, workflow and test reference
├── docker-compose.yml
├── .env.example
└── README.md
```

## Boundaries

This is a working local demonstration, not an externally deployed retail service. Payments and carriers are simulated; no real charge, delivery, email, newsletter send, or return is performed. Newsletter subscriptions are persisted. There is no tax engine, multi-currency, password-reset email, reservation expiry, real carrier integration, or returns portal. Authentication uses per-tab session storage for tokens; a production deployment should consider an HttpOnly cookie/BFF design, rate limiting, MFA for staff, HTTPS, email verification, backups and operational monitoring. These are deployment hardening concerns, not hidden demo functionality.

Images are served locally, including uploaded images. Photographs and sample branded products must be licensed/verified or replaced before commercial publication; see [docs/ASSETS.md](docs/ASSETS.md). Native uploads live in `backend/uploads`; Docker uploads use the `uploads` volume, so copy those files explicitly when switching runtime modes.

More detail: [architecture](docs/SYSTEM_ARCHITECTURE.md), [database](docs/DATABASE_DESIGN.md), [API](docs/API_DOCUMENTATION.md), [workflows](docs/BUSINESS_WORKFLOWS.md), [design](docs/DESIGN.md).
