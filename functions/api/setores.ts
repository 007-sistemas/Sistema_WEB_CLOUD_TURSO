import handler from '../../api/setores';
import { handleVercelFunction } from './_vercel-adapter';

export const onRequest = (context: any) => {
  return handleVercelFunction(context.request, context.env || {}, handler);
};
