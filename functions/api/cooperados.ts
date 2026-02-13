import handler from '../../api/cooperados';
import { handleVercelFunction } from './_vercel-adapter';

export const onRequest = (context: any) => {
  return handleVercelFunction(context.request, context.env || {}, handler);
};
