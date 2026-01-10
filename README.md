# FastBE

> Fastify based fast backend boilerplate&template

## For Readers

- This document was translated with the best effort to ensure natural wording using GPT, translation tools, and dictionaries.
- Nevertheless, there may still be inaccuracies in the translation, and readers are advised to keep this in mind.

## Setup

- Rather than cloning and building the project directly, I decided to document a manual setup approach instead.

### Install Dependencies

- `npm init -y`
- `npm install fastify @fastify/jwt @fastify/cookie @fastify/cors bcrypt ioredis pg dotenv pino pino-pretty`
- `npm install prisma @prisma/client @prisma/adapter-pg prisma-common-error-handle`
- `npm install -D typescript ts-node @types/node @types/bcrypt @types/pg vitest`

### Prisma setup

- `npx prisma init --datasource-provider postgresql --output ../generated/prisma`
- `npx prisma generate`
- `npx prisma migrate dev --name init`
- `npx prisma migrate deploy --schema ./prisma`
- `npx prisma db push`

### prisma.config.ts

- You have to import `dotenv/config`.
- This module allows Prisma to properly locate and load environment files.

```typescript
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
```

### Add .env file

- In production, you have to change env values fit in ur real world system.

```
DATABASE_URL="postgresql://postgres:ur_password@localhost:5432/ur_db_name?schema=public"

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD="ur_redis_password_this_is_optional"

SECRET=ur_secret_value

FRONTEND_ORIGIN=http://localhost:5173
```

### tsconfig.json

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
  "include": ["src/**/*", "generated/prisma"]
}
```

### vitest.config.ts

- This project uses vitest for test.
- Must! add setupFiles and exclude values.

```typescript
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

### Copy package.json

- Add the necessary scripts, and be sure to set the package `type` to `module`.
- This is required for Prisma to work properly.

```json
{
  "name": "fastbe",
  "version": "1.0.0",
  "description": "Fastify based Fast Backend boilerplate & template.",
  "scripts": {
    "dev": "tsx watch src/server.ts | pino-pretty",
    "build": "npx prisma generate && npx prisma migrate deploy --schema ./prisma && npx prisma db push && tsc",
    "start": "node dist/src/server.js | pino-pretty",
    "test": "npx prisma migrate reset --force && npx prisma generate && sleep 2 && npx vitest src/__test__/"
  },
  "type": "module",
  "dependencies": {
    "@fastify/cookie": "^11.0.2",
    "@fastify/cors": "^11.2.0",
    "@fastify/jwt": "^10.0.0",
    "@prisma/adapter-pg": "^7.2.0",
    "@prisma/client": "^7.2.0",
    "bcrypt": "^6.0.0",
    "dotenv": "^17.2.3",
    "fastify": "^5.6.2",
    "ioredis": "^5.8.2",
    "pg": "^8.16.3",
    "pino": "^10.1.0",
    "pino-pretty": "^13.1.3",
    "prisma": "^7.2.0",
    "prisma-common-error-handle": "^2.2.2"
  },
  "devDependencies": {
    "@types/bcrypt": "^6.0.0",
    "@types/node": "^25.0.3",
    "@types/pg": "^8.16.0",
    "ts-node": "^10.9.2",
    "tsx": "^4.21.0",
    "typescript": "^5.9.3",
    "vitest": "^4.0.16"
  }
}
```

### Copy and Paste

- `src` dir

## Command

- Build : `npm run build`
- Start dev environment : `npm run dev`
- Start in production : `npm run start`
- Test : `npm run test`
  - This command tests all test files in `src/__test__` directory.

## Design

### Intro

- This project is designed to serve a lightweight and high-performance REST API using Fastify.
- The architecture prioritizes developer flexibility and intentionally avoids excessive object-oriented design.

### Authentication

- User authentication is implemented using JWT.
- The access token is delivered to the client via the response body,
- while the refresh token is exchanged with the client via cookies.
- On the server side, refresh tokens are stored in Redis.
- Accordingly, the client can store and use the access token in localStorage.
- The client may optionally send an access token.
- To enable authentication for a route, add `{ preHandler: authGuard }` to the routing configuration.
- After authentication, the necessary user information can be extracted from the refresh token stored in cookies.

### ORM

- Prisma is used as the ORM.
- It allows entities to be conveniently modeled and managed as objects,
- and it is a next-generation ORM that has evolved significantly over time, becoming more robust and refined up to version 7.
- The project includes examples of advanced Prisma usage, with cursor-based pagination being a representative example.
- It also contains Prisma query patterns that are well suited for real-world production use.

### DB

- PostgreSQL is used as the database.
- But you may choose and use any database that best fits your preferences or your production environment.

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
app.setReplySerializer((payload) =>
  JSON.stringify(payload, (_, value) =>
    typeof value === "bigint" ? value.toString() : value
  )
);
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

### Prisma ORM

#### How to use composite keys

```prisma
model User {
  firstName String
  lastName  String
  email     String  @unique
  isAdmin   Boolean @default(false)

  @@id([firstName, lastName])
}
```

#### How to solve the n+1 problem

- Use fluent api.
- There must be a relationship set in the schema.
- You need to use a single query API such as `findFirst` or `findUnique`.

```typescript
//Retrieve posts based on users (in a one-to-many relationship, lookup -> n+1 problem occurs)
const posts: Post[] = await prisma.user
  .findUniuqe({ where: { id: "1" } })
  .post(); //post is the post name of the relationship defined in the users schema
```

#### Omit API

- The omit API added from prisma 5.13.0 is an API that, unlike the existing include for dto projection, lists unnecessary fields and retrieves all other fields.
- The special feature is that you can use the include API and omit field together.

```typescript
await prisma.user.findMany({
  omit: {
    password: true,
  },
});
```

## References

- [fastify/jwt reference](https://github.com/fastify/fastify-jwt)
- [prisma-fastify example](https://github.com/prisma/prisma-examples/blob/latest/orm/fastify/src/index.ts)
- [fastify routes generics for typescript users](https://fastify.dev/docs/latest/Reference/TypeScript/)
