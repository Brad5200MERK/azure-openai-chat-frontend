import { useState, useRef, useCallback } from 'react';
import { getAPIResponse } from '../core/http/index.js';
import { parseStreamedMessages } from '../core/parser/index.js';
import { getTimestamp, processText } from '../utils/index.js';
import { globalConfig } from '../config/globalConfig.js';

export const useChatController = () => {
  const [generatingAnswer, setGeneratingAnswer] = useState(false);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
  const [isProcessingResponse, setIsProcessingResponse] = useState(false);
  const [processingMessage, setProcessingMessage] = useState(null);
  const abortControllerRef = useRef(new AbortController());

  const clear = useCallback(() => {
    setIsAwaitingResponse(false);
    setIsProcessingResponse(false);
    setGeneratingAnswer(false);
  }, []);

  const reset = useCallback(() => {
    setProcessingMessage(null);
    clear();
  }, [clear]);

  const processResponse = useCallback(async (response, isUserMessage = false, useStream = false) => {
    const citations = [];
    const followingSteps = [];
    const followupQuestions = [];
    const timestamp = getTimestamp();
    let thoughts;
    let dataPoints;

    const updateChatWithMessageOrChunk = async (message, chunked) => {
      const newMessage = {
        id: crypto.randomUUID(),
        text: [
          {
            value: chunked ? '' : message,
            followingSteps,
          },
        ],
        followupQuestions,
        citations: [...new Set(citations)],
        timestamp: timestamp,
        isUserMessage,
        thoughts,
        dataPoints,
      };

      setProcessingMessage(newMessage);

      if (chunked && newMessage) {
        setIsProcessingResponse(true);
        abortControllerRef.current = new AbortController();

        await parseStreamedMessages({
          chatEntry: newMessage,
          signal: abortControllerRef.current.signal,
          apiResponseBody: message.body,
          onChunkRead: (updated) => {
            setProcessingMessage(updated);
          },
          onCancel: () => {
            clear();
          },
        });

        clear();
      }
    };

    if (isUserMessage || typeof response === 'string') {
      await updateChatWithMessageOrChunk(response, false);
    } else if (useStream) {
      await updateChatWithMessageOrChunk(response, true);
    } else {
      const generatedResponse = response.choices[0].message;
      const processedText = processText(generatedResponse.content, [citations, followingSteps, followupQuestions]);
      const messageToUpdate = processedText.replacedText;
      
      citations.push(...processedText.arrays[0]);
      followingSteps.push(...processedText.arrays[1]);
      followupQuestions.push(...processedText.arrays[2]);
      thoughts = generatedResponse.context?.thoughts ?? '';
      dataPoints = generatedResponse.context?.data_points ?? [];

      await updateChatWithMessageOrChunk(messageToUpdate, false);
    }
  }, [clear]);

  const generateAnswer = useCallback(async (requestOptions, httpOptions) => {
    const { question } = requestOptions;

    if (question) {
      try {
        setGeneratingAnswer(true);

        if (requestOptions.type === 'chat') {
          await processResponse(question, true, false);
        }

        setIsAwaitingResponse(true);
        setProcessingMessage(null);

        const response = await getAPIResponse(requestOptions, httpOptions);
        setIsAwaitingResponse(false);

        await processResponse(response, false, httpOptions.stream);
      } catch (error) {
        const chatError = {
          message: error?.code === 400 ? globalConfig.INVALID_REQUEST_ERROR : globalConfig.API_ERROR_MESSAGE,
        };

        if (!processingMessage) {
          await processResponse('', false, false);
        }

        setProcessingMessage(prev => prev ? { ...prev, error: chatError } : null);
      } finally {
        clear();
      }
    }
  }, [processResponse, processingMessage, clear]);

  const cancelRequest = useCallback(() => {
    abortControllerRef.current.abort();
  }, []);

  return {
    generatingAnswer,
    isAwaitingResponse,
    isProcessingResponse,
    processingMessage,
    generateAnswer,
    cancelRequest,
    reset,
  };
};