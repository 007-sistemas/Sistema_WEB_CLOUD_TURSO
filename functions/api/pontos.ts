import handler from '../../api/pontos';
import { handleVercelFunction } from './_vercel-adapter';

export const onRequest = (context: any) => {
  return handleVercelFunction(context.request, context.env || {}, handler);
};
