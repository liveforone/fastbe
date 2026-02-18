export namespace RemovePost {
  export const PATH = "/:id";
  export const METHOD = "DELETE" as const;
  export const STATUS = 200 as const;

  export interface Response {
    ok: true;
  }
}
