import { createClient } from '@libsql/client';

const databaseUrl = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;

if (!databaseUrl || !authToken) {
  throw new Error('Missing DATABASE_URL or DATABASE_AUTH_TOKEN env var');
}

const client = createClient({
  url: databaseUrl,
  authToken,
});

const buildQuery = (strings, values) => {
  let text = strings[0];
  const args = [];

  for (let i = 0; i < values.length; i += 1) {
    text += `?${strings[i + 1]}`;
    args.push(values[i]);
  }

  return { text, args };
};

export const sql = async (strings, ...values) => {
  const { text, args } = buildQuery(strings, values);
  const result = await client.execute({ sql: text, args });
  return result.rows ?? [];
};
