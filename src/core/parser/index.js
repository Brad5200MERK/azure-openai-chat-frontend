import { ChatResponseError, newListWithEntryAtIndex } from '../../utils/index.js';
import { createReader, readStream } from '../stream/index.js';

export async function parseStreamedMessages({
  chatEntry,
  apiResponseBody,
  signal,
  onChunkRead: onVisit,
  onCancel,
}) {
  const reader = createReader(apiResponseBody);
  const chunks = readStream(reader);

  const streamedMessageRaw = [];
  const stepsBuffer = [];
  const followupQuestionsBuffer = [];
  let isProcessingStep = false;
  let isLastStep = false;
  let isFollowupQuestion = false;
  let followUpQuestionIndex = 0;
  let stepIndex = 0;
  let textBlockIndex = 0;

  let updatedEntry = { ...chatEntry };

  for await (const chunk of chunks) {
    if (signal.aborted) {
      onCancel();
      return;
    }

    if (chunk.error) {
      throw new ChatResponseError(chunk.message, chunk.statusCode);
    }

    if (chunk.choices[0].finish_reason === 'content_filter') {
      throw new ChatResponseError('Content filtered', 400);
    }

    const { content, context } = chunk.choices[0].delta;
    if (context?.data_points) {
      updatedEntry.dataPoints = context.data_points ?? [];
      updatedEntry.thoughts = context.thoughts ?? '';
      continue;
    }
    
    let chunkValue = content ?? '';

    if (chunkValue === '') {
      continue;
    }

    streamedMessageRaw.push(chunkValue);

    const LIST_ITEM_NUMBER = /(\d+)/;
    let matchedStepIndex = chunkValue.match(LIST_ITEM_NUMBER)?.[0];
    if (matchedStepIndex) {
      stepsBuffer.push(matchedStepIndex);
      continue;
    }

    const matchedFollowupQuestionMarker =
      (!isFollowupQuestion && chunkValue.includes('Next')) || chunkValue.includes('<<');
    
    if (matchedFollowupQuestionMarker) {
      isFollowupQuestion = true;
      followupQuestionsBuffer.push(chunkValue);
      continue;
    } else if (followupQuestionsBuffer.length > 0 && chunkValue.includes('Question')) {
      isFollowupQuestion = true;
      followupQuestionsBuffer.push(chunkValue);
      continue;
    } else if (chunkValue.includes('<<') && isFollowupQuestion) {
      isFollowupQuestion = true;
      continue;
    } else if (chunkValue.includes('>\n')) {
      followUpQuestionIndex = followUpQuestionIndex + 1;
      isFollowupQuestion = true;
      continue;
    } else if (isFollowupQuestion) {
      isFollowupQuestion = true;
      chunkValue = chunkValue.replace(/:?\n/, '').replaceAll('>', '');
    }

    if (stepsBuffer.length > 0 && chunkValue.includes('.')) {
      isProcessingStep = true;
      matchedStepIndex = stepsBuffer[0];
      stepsBuffer.length = 0;
    } else if (chunkValue.includes('\n\n')) {
      if (isProcessingStep) {
        isLastStep = true;
      }
    }

    if (matchedStepIndex || isProcessingStep || isFollowupQuestion) {
      if (matchedStepIndex) {
        chunkValue = '';
      }
      stepIndex = matchedStepIndex ? Number(matchedStepIndex) - 1 : stepIndex;

      updatedEntry = updateFollowingStepOrFollowupQuestionEntry({
        chunkValue,
        textBlockIndex,
        stepIndex,
        isFollowupQuestion,
        followUpQuestionIndex,
        chatEntry: updatedEntry,
      });

      if (isLastStep) {
        isProcessingStep = false;
        isLastStep = false;
        isFollowupQuestion = false;
        stepIndex = 0;
        textBlockIndex++;
      }
    } else {
      updatedEntry = updateTextEntry({ chunkValue, textBlockIndex, chatEntry: updatedEntry });
    }
    
    const citations = parseCitations(streamedMessageRaw.join(''));
    updatedEntry = updateCitationsEntry({ citations, chatEntry: updatedEntry });

    onVisit(updatedEntry);
  }
}

export function updateCitationsEntry({ citations, chatEntry }) {
  const lastMessageEntry = chatEntry;
  const updateCitationReference = (match, capture) => {
    const citation = citations.find((citation) => citation.text === capture);
    if (citation) {
      return `<sup class="citation">${citation.ref}</sup>`;
    }
    return match;
  };

  const textEntrys = lastMessageEntry.text.map((textEntry) => {
    const value = textEntry.value.replaceAll(/\[(.*?)]/g, updateCitationReference);
    const followingSteps = textEntry.followingSteps?.map((step) =>
      step.replaceAll(/\[(.*?)]/g, updateCitationReference),
    );
    return {
      value,
      followingSteps,
    };
  });

  return {
    ...lastMessageEntry,
    text: textEntrys,
    citations,
  };
}

export function parseCitations(inputText) {
  const findCitations = /\[(.*?)]/g;
  const citation = {};
  let referenceCounter = 1;

  inputText.replaceAll(findCitations, (_, capture) => {
    const citationText = capture.trim();
    if (!citation[citationText]) {
      citation[citationText] = referenceCounter++;
    }
    return '';
  });

  return Object.keys(citation).map((text, index) => ({
    ref: index + 1,
    text,
  }));
}

export function updateTextEntry({ chunkValue, textBlockIndex, chatEntry }) {
  const { text: lastChatMessageTextEntry } = chatEntry;
  const block = lastChatMessageTextEntry[textBlockIndex] ?? {
    value: '',
    followingSteps: [],
  };

  const value = (block.value || '') + chunkValue;

  return {
    ...chatEntry,
    text: newListWithEntryAtIndex(lastChatMessageTextEntry, textBlockIndex, {
      ...block,
      value,
    }),
  };
}

export function updateFollowingStepOrFollowupQuestionEntry({
  chunkValue,
  textBlockIndex,
  stepIndex,
  isFollowupQuestion,
  followUpQuestionIndex,
  chatEntry,
}) {
  const { followupQuestions, text: lastChatMessageTextEntry } = chatEntry;
  
  if (isFollowupQuestion && followupQuestions) {
    const question = (followupQuestions[followUpQuestionIndex] || '') + chunkValue;
    return {
      ...chatEntry,
      followupQuestions: newListWithEntryAtIndex(followupQuestions, followUpQuestionIndex, question),
    };
  }

  if (lastChatMessageTextEntry && lastChatMessageTextEntry[textBlockIndex]) {
    const { followingSteps } = lastChatMessageTextEntry[textBlockIndex];
    if (followingSteps) {
      const step = (followingSteps[stepIndex] || '') + chunkValue;
      return {
        ...chatEntry,
        text: newListWithEntryAtIndex(lastChatMessageTextEntry, textBlockIndex, {
          ...lastChatMessageTextEntry[textBlockIndex],
          followingSteps: newListWithEntryAtIndex(followingSteps, stepIndex, step),
        }),
      };
    }
  }

  return chatEntry;
}