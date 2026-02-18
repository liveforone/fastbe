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
