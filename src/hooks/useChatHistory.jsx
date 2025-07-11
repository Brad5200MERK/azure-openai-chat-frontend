import { useState, useEffect, useCallback } from 'react';
import { globalConfig, MAX_CHAT_HISTORY } from '../config/globalConfig.js';
import ChatActionButton from '../components/ChatActionButton.jsx';
import iconHistory from '../svg/history-icon.svg?raw';
import iconHistoryDismiss from '../svg/history-dismiss-icon.svg?raw';

const CHATHISTORY_ID = 'ms-azoaicc:history';

export const useChatHistory = () => {
  const [chatHistory, setChatHistory] = useState([]);
  const [showChatHistory, setShowChatHistory] = useState(false);

  useEffect(() => {
    const storedHistory = localStorage.getItem(CHATHISTORY_ID);
    if (storedHistory) {
      try {
        const encodedHistory = atob(storedHistory);
        const decodedHistory = decodeURIComponent(encodedHistory);
        const history = JSON.parse(decodedHistory);

        const lastUserMessagesIndexes = history
          .map((entry, index) => entry.isUserMessage ? index : undefined)
          .filter((index) => index !== undefined)
          .slice(-MAX_CHAT_HISTORY);

        const trimmedHistory = lastUserMessagesIndexes.length === 0 
          ? history 
          : history.slice(lastUserMessagesIndexes[0]);

        setChatHistory(trimmedHistory);
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    }
  }, []);

  const saveChatHistory = useCallback((currentChat) => {
    const newChatHistory = [...chatHistory, ...currentChat];
    try {
      const utf8EncodedString = encodeURIComponent(JSON.stringify(newChatHistory));
      localStorage.setItem(CHATHISTORY_ID, btoa(utf8EncodedString));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }, [chatHistory]);

  const handleChatHistoryButtonClick = useCallback((event) => {
    event.preventDefault();
    setShowChatHistory(prev => !prev);
  }, []);

  const renderHistoryButton = useCallback((options) => {
    return (
      <ChatActionButton
        label={showChatHistory ? globalConfig.HIDE_CHAT_HISTORY_LABEL : globalConfig.SHOW_CHAT_HISTORY_LABEL}
        actionId="chat-history-button"
        onClick={handleChatHistoryButtonClick}
        isDisabled={options?.disabled}
        svgIcon={showChatHistory ? iconHistoryDismiss : iconHistory}
      />
    );
  }, [showChatHistory, handleChatHistoryButtonClick]);

  return {
    chatHistory,
    showChatHistory,
    saveChatHistory,
    renderHistoryButton,
  };
};