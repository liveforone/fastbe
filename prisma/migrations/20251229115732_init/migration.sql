-- CreateEnum
CREATE TYPE "role" AS ENUM ('MEMBER', 'ADMIN');

-- CreateEnum
CREATE TYPE "post_state" AS ENUM ('ORIGINAL', 'EDITED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "role" NOT NULL DEFAULT 'MEMBER',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post" (
    "id" BIGSERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "post_state" "post_state" NOT NULL DEFAULT 'ORIGINAL',
    "writer_id" TEXT NOT NULL,
    "created_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AddForeignKey
ALTER TABLE "post" ADD CONSTRAINT "post_writer_id_fkey" FOREIGN KEY ("writer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
