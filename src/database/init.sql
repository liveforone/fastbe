CREATE TYPE role AS ENUM ('MEMBER', 'ADMIN');
CREATE TYPE post_state AS ENUM ('ORIGINAL', 'EDITED');

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role role NOT NULL DEFAULT 'MEMBER'
);
CREATE INDEX idx_username ON users(username);

CREATE TABLE post (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    post_state post_state NOT NULL DEFAULT 'ORIGINAL',
    writer_id TEXT NOT NULL,
    created_date TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (writer_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX idx_post_writer_id ON post(writer_id);
