import { ChatResponseError } from '../../utils/index.js';

export async function callHttpApi(
  { question, type, approach, overrides, messages },
  { method, url, stream, signal }
) {
  return await fetch(`${url}/${type}`, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
    body: JSON.stringify({
      messages: [
        ...(messages ?? []),
        {
          content: question,
          role: 'user',
        },
      ],
      context: {
        ...overrides,
        approach,
      },
      stream: type === 'chat' ? stream : false,
    }),
  });
}

export async function getAPIResponse(requestOptions, httpOptions) {
  const response = await callHttpApi(requestOptions, httpOptions);

  const streamResponse = requestOptions.type === 'ask' ? false : httpOptions.stream;
  if (streamResponse) {
    return response;
  }
  
  const parsedResponse = await response.json();
  if (response.status > 299 || !response.ok) {
    throw new ChatResponseError(response.statusText, response.status) || 'API Response Error';
  }
  return parsedResponse;
}