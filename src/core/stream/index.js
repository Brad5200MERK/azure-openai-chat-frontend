import { NdJsonParserStream } from './data-format/ndjson.js';
import { globalConfig } from '../../config/globalConfig.js';

export function createReader(responseBody) {
  return responseBody?.pipeThrough(new TextDecoderStream()).pipeThrough(new NdJsonParserStream()).getReader();
}

export async function* readStream(reader) {
  if (!reader) {
    throw new Error('No response body or body is not readable');
  }

  let value;
  let done;
  while ((({ value, done } = await reader.read()), !done)) {
    yield new Promise((resolve) => {
      setTimeout(() => {
        resolve(value);
      }, globalConfig.BOT_TYPING_EFFECT_INTERVAL);
    });
  }
}

export function cancelStream(stream) {
  if (stream) {
    stream.cancel();
  }
}