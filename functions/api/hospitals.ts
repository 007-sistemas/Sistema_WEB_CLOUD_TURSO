import handler from '../../api/hospitals';
import { handleVercelFunction } from './_vercel-adapter';

export const onRequest = (context: any) => {
  return handleVercelFunction(context.request, context.env || {}, handler);
};
