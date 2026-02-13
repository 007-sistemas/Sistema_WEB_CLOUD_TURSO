import { createClient } from '@libsql/client';

let client: ReturnType<typeof createClient> | null = null;

export const hasDbConfig = () => {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_AUTH_TOKEN);
};

const getClient = () => {
  if (!hasDbConfig()) {
    throw new Error('Missing DATABASE_URL or DATABASE_AUTH_TOKEN env var');
  }

  if (!client) {
    client = createClient({
      url: process.env.DATABASE_URL as string,
      authToken: process.env.DATABASE_AUTH_TOKEN as string,
    });
  }

  return client;
};

const buildQuery = (strings: TemplateStringsArray, values: unknown[]) => {
  let text = strings[0];
  const args: any[] = [];

  for (let i = 0; i < values.length; i += 1) {
    text += `?${strings[i + 1]}`;
    args.push(values[i]);
  }

  return { text, args };
};

export const sql = async (strings: TemplateStringsArray, ...values: unknown[]) => {
  const { text, args } = buildQuery(strings, values);
  const result = await getClient().execute({ sql: text, args: args as any });
  return result.rows ?? [];
};
