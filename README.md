# FastBE

> Fastify based fast backend boilerplate&template

## Introduction

- This project adopts a functional-programming–inspired approach where system interfaces are defined first, before actual implementation.
- The API specifications are written first, and the backend is built based on those specs.
- You can find the exact specifications in the src/somedomain-dir/api directory.
- The goal of this architecture is to write the API specs first in the api directory and then implement controllers on top of them, keeping the controllers thin.
- By writing the API specs first, then the business logic, running tests to verify correct behavior, and only then implementing the controllers, this project naturally supports test-driven and spec-driven development.
- Infrastructure-level error wrappers handle errors consistently across DB, authentication, and other layers.

## Key Folders & Files

- src/
  - `dependency-injection.ts`: DI container, injects services/repositories/controllers into Fastify instance
  - `server.ts`: Server bootstrap, global error handler, middleware (CORS, cookies, JWT) setup
  - `database/`: DB schema, DB connection, BaseRepository, and related code
  - `errors/`: Global errors, DB error enum/map, Kysely error handler
  - `post/, users/`: Domain-specific API, controller, repository, service, DTO
  - `config/`: Infrastructure settings (logger, Redis)
  - `util/`: Utility functions like password hashing/validation
  - `__test__`/: Vitest-based integration tests

## Setup

- Rather than cloning and building the project directly, I decided to document a manual setup approach instead.

### 1. Install Dependencies

- `npm init -y`
- `npm install fastify @fastify/jwt @fastify/cookie @fastify/cors bcrypt zod ioredis pg dotenv pino pino-pretty`
- `npm install kysely`
- `npm install -D typescript ts-node @types/node @types/bcrypt @types/pg vitest`

### 2. Creating TypeScript, Vitest, and Environment Configuration Files

- Create the configuration files by referring to the examples of `tsconfig.json` and `vitest.config.ts`.
- Below is the `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "rootDir": ".",
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*"]
}
```

- Below is the vitest.config.ts.
- Important: You must add setupFiles and exclude values.

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    testTimeout: 30_000,
    setupFiles: ["dotenv/config"],
    include: ["src/**/*.test.ts"],
    exclude: ["dist", "node_modules"],
  },
});
```

- Create a .env file and configure environment variables such as DB, Redis, JWT, and CORS.

```env
DATABASE_URL="postgresql://postgres:ur_password@localhost:5432/ur_db_name?schema=public"

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD="ur_redis_password_this_is_optional"

SECRET=ur_secret_value

FRONTEND_ORIGIN=http://localhost:5173
```

- Add the necessary scripts, and make sure to set the type field in package.json to module.

```json
"type": "module",
```

### 3. Create the src Directory and Copy the Code

- Create the src/ directory and replicate the internal file structure exactly.
- For each file, refer to the code in this repository and copy/write accordingly.

#### 3-1. kysely setup

- You must enable `strict` mode in your tsconfig.json file's compilerOptions.
- Define db schema in /database/schema.ts.

```typescript
// /database/schema.ts
import { Generated, Selectable } from "kysely";

export interface Database {
  users: UsersTable;
  post: PostTable;
}

export interface UsersTable {
  id: string;
  username: string;
  password: string;
  role: "MEMBER" | "ADMIN";
}
export type Users = Selectable<UsersTable>;

export interface PostTable {
  id: Generated<bigint>;
  title: string;
  content: string;
  post_state: "ORIGINAL" | "EDITED";
  writer_id: string;
  created_date: Generated<Date>;
}
export type Post = Selectable<PostTable>;
```

- The `selectable` type must be explicitly defined.
- Only then can it be utilized as a return type.
- Next, create the file /database/database.ts, which is responsible for establishing a connection to the database.

```typescript
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { Database } from "./schema.js";

export function createDB(): Kysely<Database> {
  const dialect = new PostgresDialect({
    pool: new Pool({
      database: "ur_db_name",
      host: "localhost", // Database is running on local system.
      user: "postgres",
      port: 5432,
      password: "1111", // Put your db password.
      max: 10, //Enter the maximum number of connections you want.
    }),
  });

  return new Kysely<Database>({ dialect });
}
```

### 4. Prepare DB and Redis

- Install PostgreSQL and Redis locally or in your desired environment.
- Refer to src/database/init.sql to create the database schema.

### 5. Development / Build / Test Commands

```bash
npm run dev      # Start development server
npm run build    # Build the project
npm run start    # Run the server after build
npm run test     # Run integration tests
```

### 6. Additional Notes

- Ensure that major library versions such as Zod v3 and Fastify v5 match exactly.
- Environment variables, DB connection details, Redis settings, etc., must be adjusted according to your actual environment.

## Design

### Intro

- This project is designed to serve a lightweight and high-performance REST API using Fastify.
- The architecture prioritizes developer flexibility and intentionally avoids excessive object-oriented design.

### Architecture & Design Features

- Spec-First Development: define DTOs, paths, response types per domain in api/ first
- Thin Controllers: business logic resides in services/repositories
- Test-First: integration tests using real DB/Redis provided
- JWT Authentication & Authorization, Redis-based refresh token management
- Pino Logging, Zod v3 DTO validation
- BigInt Serialization, CORS/cookie handling for production-ready environments

### Dependency Injection (DI)

- In src/dependency-injection.ts, inject DB, repositories, services, and controllers into the Fastify instance.
- Each domain (e.g., users, post) connects dependencies in the order: repository → service → controller.
- DI improves testability, modularity, and maintainability.

### Infrastructure-Level Error Wrapper

- `src/errors/kysely.error.handler.ts` maps PostgreSQL errors to GlobalError.
- DB error codes are managed via enums/maps (db-error.enum.ts, db-error.map.ts) and converted to consistent HTTP status and messages.
- Errors across authentication, authorization, input validation, etc., are integrated into the global error handler.

### DB

- PostgreSQL is used as the database.
- But you may choose and use any database that best fits your preferences or your production environment.

### Kysely Query Builder & BaseRepository Layering

- Unlike Prisma, Kysely does not throw errors for queries that return no rows or updates/deletes that affect 0 rows; it behaves like raw SQL.
- To handle this, BaseRepository provides three layers of methods:
  - executeOne: SELECT that must return exactly 1 row (404 if not found)
  - executeQuery: SELECT that may return 0 or more rows (e.g., pagination, search)
  - executeMutation: UPDATE/DELETE must affect ≥1 row (404 if 0)
- Repositories like users.repository.ts and post.repository.ts use these methods to enforce clear responsibilities.

### Query/Mutation Separation

- Database operations are clearly separated into Queries (read) and Mutations (write):

```psql
  | Type     | Meaning | DB Operation             |
  | -------- | ------- | ----------------------- |
  | Query    | Read    | SELECT                  |
  | Mutation | Write   | INSERT / UPDATE / DELETE|
```

- Queries are further split:
  - Query-Required: must return ≥1 row (`executeOne`)
  - Query-Optional: may return 0 rows (`executeQuery`)

### Authentication

- User authentication is implemented using JWT.
- The access token is delivered to the client via the response body,
- while the refresh token is exchanged with the client via cookies.
- On the server side, refresh tokens are stored in Redis(or RDB).
- Accordingly, the client can store and use the access token in localStorage.
- The client may optionally send an access token.
- To enable authentication for a route, add `{ preHandler: authGuard }` to the routing configuration.
- After authentication, the necessary user information can be extracted from the refresh token stored in cookies.

### Testing

- For testing, the project includes examples of integration tests using a real database rather than mocks.
- Vitest is used to provide fast and powerful testing capabilities.

### Logging

- For both development and production environments, server logging is handled using Pino,
- which is the logger recommended by Fastify.

## Document

### bigint type serialization

- This project uses the bigint type in the Post entity.
- Since Node.js does not support bigint serialization by default, extra configuration is required to serialize it properly.
- The code below handles serialization by converting only bigint values to strings before returning the response to the client.

```typescript
app.setReplySerializer((payload) => {
  if (payload === undefined || payload === null) {
    return "";
  }

  return JSON.stringify(payload, (_, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
});
```

### CORS Configuration and Cookie Setting

- This project follows a client–server separated architecture by default.
- As a result, CORS must be configured to allow secure communication with the client.
- The following code enables CORS for the frontend origin defined in the .env configuration.
- Additionally, because refresh tokens are exchanged with the client via cookies, the credentials option is enabled by setting it to true.
- At this point, a question may arise: if the credentials option is enabled, does every API request have to include the refresh token in cookies?
- If a request does not include cookies, will an error occur?
- The answer is no.
- Enabling this option simply means that requests may include cookies and are allowed to send them.
- It does not mean that cookies are required for every request, nor does it imply that requests without cookies are blocked.
- In other words, cookies are not enforced.
- Developers who are less familiar with how cookies work may have these concerns, so this brief explanation is provided to clarify the concept.
- When setting cookies, the path is important.
- In the current design, cookies are only set when requests are made to /auth, and they are not included for other routes.
- This is because the access token is already sent to the client and stored in local storage, so other API requests that require a token can use the access token instead.
- Refresh tokens, on the other hand, are related to authentication, so the system is designed this way.
- If you want cookies to be sent for all routes, you can modify the part where cookies are set in the auth routes.

```typescript
app.register(cors, {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);

    const allowed = process.env.FRONTEND_ORIGIN;
    if (origin === allowed) {
      cb(null, true);
    } else {
      cb(new Error("Not allowed by CORS"), false);
    }
  },
  credentials: true,
});
```

### Caution of zod version

- This project uses **Zod version 3**.
- If you do not match the Zod version, errors will occur, so please make sure to use **zod/v3**.

### Make Good Use of the satisfies Operator

- Make good use of the satisfies operator, which provides a flexible way to ensure type safety.
- In particular, by defining things like cookie options and response types in the API specs and then checking them in the router with the satisfies operator, you can catch incorrect types at compile time.

## References

- [fastify/jwt reference](https://github.com/fastify/fastify-jwt)
- [fastify routes generics for typescript users](https://fastify.dev/docs/latest/Reference/TypeScript/)
