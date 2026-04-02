import { handleLeadRequest } from '../../lib/pipedriveLead.js';

export const handler = async (event) =>
  handleLeadRequest({
    httpMethod: event.httpMethod,
    body: event.body || '',
  });
