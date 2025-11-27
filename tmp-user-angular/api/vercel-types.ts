export type VercelRequest = {
  method?: string;
  query: Record<string, unknown> & { [key: string]: string | string[] | undefined };
  body?: unknown;
};

export type VercelResponse = {
  status: (statusCode: number) => VercelResponse;
  json: (body: unknown) => void;
};
