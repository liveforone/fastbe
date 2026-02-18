export interface IPostParams {
  id: bigint;
}

export interface IPostPageQuerystring {
   "last-id"?: bigint;
}

export interface IPostSearchQuerystring {
  keyword: string; 
  "last-id"?: bigint;
}
