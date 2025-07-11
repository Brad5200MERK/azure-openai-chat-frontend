import React, { useState, useRef, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { globalConfig, teaserListTexts, requestOptions, chatHttpOptions, MAX_CHAT_HISTORY } from '../config/globalConfig.js';
import { chatEntryToString, newListWithEntryAtIndex } from '../utils/index.js';
import { useChatController } from '../hooks/useChatController.js';
import { useChatHistory } from '../hooks/useChatHistory.js';

// Import components
import ChatStage from './ChatStage.jsx';
import LoadingIndicator from './LoadingIndicator.jsx';
import VoiceInputButton from './VoiceInputButton.jsx';
import TeaserListComponent from './TeaserListComponent.jsx';
import DocumentPreviewer from './DocumentPreviewer.jsx';
import TabComponent from './TabComponent.jsx';
import CitationList from './CitationList.jsx';
import ChatThreadComponent from './ChatThreadComponent.jsx';
import ChatActionButton from './ChatActionButton.jsx';

// Import SVG icons
import iconLightBulb from '../svg/lightbulb-icon.svg?raw';
import iconDelete from '../svg/delete-icon.svg?raw';
import iconCancel from '../svg/cancel-icon.svg?raw';
import iconSend from '../svg/send-icon.svg?raw';
import iconClose from '../svg/close-icon.svg?raw';
import iconLogo from '../svg/branding/brand-logo.svg?raw';
import iconUp from '../svg/chevron-up-icon.svg?raw';

const ChatComponent = ({
  inputPosition = 'sticky',
  interactionModel = 'chat',
  apiUrl = chatHttpOptions.url,
  isCustomBranding = globalConfig.IS_CUSTOM_BRANDING,
  useStream = chatHttpOptions.stream,
  overrides = {},
  customStyles = {},
  theme = 'light'
}) => {
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isChatStarted, setIsChatStarted] = useState(false);
  const [isResetInput, setIsResetInput] = useState(false);
  const [isShowingThoughtProcess, setIsShowingThoughtProcess] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [selectedChatEntry, setSelectedChatEntry] = useState(null);
  const [selectedAsideTab, setSelectedAsideTab] = useState('tab-thought-process');
  const [chatThread, setChatThread] = useState([]);
  const [isDefaultPromptsEnabled, setIsDefaultPromptsEnabled] = useState(globalConfig.IS_DEFAULT_PROMPTS_ENABLED && !isChatStarted);

  const questionInputRef = useRef(null);
  const overlayRef = useRef(null);
  const containerWrapperRef = useRef(null);

  const chatController = useChatController();
  const chatHistoryController = useChatHistory();

  const isDisabled = chatController.generatingAnswer;

  // Apply custom styles
  useEffect(() => {
    if (customStyles && Object.keys(customStyles).length > 0) {
      const root = document.documentElement;
      root.style.setProperty('--c-accent-high', customStyles.AccentHigh);
      root.style.setProperty('--c-accent-lighter', customStyles.AccentLight);
      root.style.setProperty('--c-accent-dark', customStyles.AccentDark);
      root.style.setProperty('--c-text-color', customStyles.TextColor);
      root.style.setProperty('--c-light-gray', customStyles.BackgroundColor);
      root.style.setProperty('--c-dark-gray', customStyles.ForegroundColor);
      root.style.setProperty('--c-base-gray', customStyles.FormBackgroundColor);
      root.style.setProperty('--radius-base', customStyles.BorderRadius);
      root.style.setProperty('--border-base', customStyles.BorderWidth);
      root.style.setProperty('--font-base', customStyles.FontBaseSize);
    }
  }, [customStyles]);

  // Update chat thread when processing message changes
  useEffect(() => {
    if (chatController.processingMessage) {
      const processingEntry = chatController.processingMessage;
      const index = chatThread.findIndex((entry) => entry.id === processingEntry.id);

      setChatThread(prevThread => 
        index > -1
          ? newListWithEntryAtIndex(prevThread, index, processingEntry)
          : [...prevThread, processingEntry]
      );
    }
  }, [chatController.processingMessage, chatThread]);

  const setQuestionInputValue = useCallback((value) => {
    if (questionInputRef.current) {
      questionInputRef.current.value = DOMPurify.sanitize(value || '');
      setCurrentQuestion(questionInputRef.current.value);
    }
  }, []);

  const handleVoiceInput = useCallback((input) => {
    setQuestionInputValue(input);
  }, [setQuestionInputValue]);

  const handleQuestionInputClick = useCallback((question) => {
    setQuestionInputValue(question);
  }, [setQuestionInputValue]);

  const handleCitationClick = useCallback((citation, chatThreadEntry) => {
    setSelectedCitation(citation);

    if (!isShowingThoughtProcess) {
      if (chatThreadEntry) {
        setSelectedChatEntry(chatThreadEntry);
      }
      handleExpandAside();
      setSelectedAsideTab('tab-citations');
    }
  }, [isShowingThoughtProcess]);

  const getMessageContext = useCallback(() => {
    if (interactionModel === 'ask') {
      return [];
    }

    const history = [
      ...chatThread,
      ...(chatHistoryController.showChatHistory ? chatHistoryController.chatHistory : []),
    ];

    return history.map((entry) => ({
      content: chatEntryToString(entry),
      role: entry.isUserMessage ? 'user' : 'assistant',
    }));
  }, [interactionModel, chatThread, chatHistoryController.showChatHistory, chatHistoryController.chatHistory]);

  const handleUserChatSubmit = useCallback(async (event) => {
    event.preventDefault();
    collapseAside();
    
    const question = DOMPurify.sanitize(questionInputRef.current.value);
    setIsChatStarted(true);
    setIsDefaultPromptsEnabled(false);

    await chatController.generateAnswer(
      {
        ...requestOptions,
        overrides: {
          ...requestOptions.overrides,
          ...overrides,
        },
        question,
        type: interactionModel,
        messages: getMessageContext(),
      },
      {
        ...chatHttpOptions,
        url: apiUrl,
        stream: useStream,
      },
    );

    if (interactionModel === 'chat') {
      chatHistoryController.saveChatHistory(chatThread);
    }

    questionInputRef.current.value = '';
    setIsResetInput(false);
  }, [chatController, overrides, interactionModel, getMessageContext, apiUrl, useStream, chatHistoryController, chatThread]);

  const resetInputField = useCallback((event) => {
    event.preventDefault();
    questionInputRef.current.value = '';
    setCurrentQuestion('');
    setIsResetInput(false);
  }, []);

  const resetCurrentChat = useCallback((event) => {
    setIsChatStarted(false);
    setChatThread([]);
    setIsDefaultPromptsEnabled(true);
    setSelectedCitation(null);
    chatController.reset();
    chatHistoryController.saveChatHistory([]);
    collapseAside();
    handleUserChatCancel(event);
  }, [chatController, chatHistoryController]);

  const showDefaultPrompts = useCallback((event) => {
    if (!isDefaultPromptsEnabled) {
      resetCurrentChat(event);
    }
  }, [isDefaultPromptsEnabled, resetCurrentChat]);

  const handleOnInputChange = useCallback(() => {
    setIsResetInput(!!questionInputRef.current.value);
  }, []);

  const handleUserChatCancel = useCallback((event) => {
    event?.preventDefault();
    chatController.cancelRequest();
  }, [chatController]);

  const handleExpandAside = useCallback(() => {
    setIsShowingThoughtProcess(true);
    setSelectedAsideTab('tab-thought-process');
    if (overlayRef.current) {
      overlayRef.current.classList.add('active');
    }
    if (containerWrapperRef.current) {
      containerWrapperRef.current.classList.add('aside-open');
    }
  }, []);

  const collapseAside = useCallback(() => {
    setIsShowingThoughtProcess(false);
    setSelectedCitation(null);
    if (containerWrapperRef.current) {
      containerWrapperRef.current.classList.remove('aside-open');
    }
    if (overlayRef.current) {
      overlayRef.current.classList.remove('active');
    }
  }, []);

  const handleChatEntryActionButtonClick = useCallback((actionId, chatThreadEntry) => {
    if (actionId === 'chat-show-thought-process') {
      setSelectedChatEntry(chatThreadEntry);
      handleExpandAside();
    }
  }, [handleExpandAside]);

  const renderChatOrCancelButton = () => {
    const submitChatButton = (
      <button
        className="chatbox__button"
        data-testid="submit-question-button"
        onClick={handleUserChatSubmit}
        title={globalConfig.CHAT_BUTTON_LABEL_TEXT}
        disabled={isDisabled}
      >
        <span dangerouslySetInnerHTML={{ __html: iconSend }} />
      </button>
    );

    const cancelChatButton = (
      <button
        className="chatbox__button"
        data-testid="cancel-question-button"
        onClick={handleUserChatCancel}
        title={globalConfig.CHAT_CANCEL_BUTTON_LABEL_TEXT}
      >
        <span dangerouslySetInnerHTML={{ __html: iconCancel }} />
      </button>
    );

    return chatController.isProcessingResponse ? cancelChatButton : submitChatButton;
  };

  const renderChatEntryTabContent = (entry) => {
    const tabs = [
      {
        id: 'tab-thought-process',
        label: globalConfig.THOUGHT_PROCESS_LABEL,
      },
      {
        id: 'tab-support-context',
        label: globalConfig.SUPPORT_CONTEXT_LABEL,
      },
      {
        id: 'tab-citations',
        label: globalConfig.CITATIONS_TAB_LABEL,
      },
    ];

    return (
      <TabComponent
        tabs={tabs}
        selectedTabId={selectedAsideTab}
        onTabChange={setSelectedAsideTab}
      >
        <div slot="tab-thought-process" className="tab-component__content">
          {entry && entry.thoughts && (
            <p className="tab-component__paragraph" dangerouslySetInnerHTML={{ __html: entry.thoughts }} />
          )}
        </div>
        <div slot="tab-support-context" className="tab-component__content">
          {entry && entry.dataPoints && (
            <TeaserListComponent
              alwaysRow={true}
              teasers={entry.dataPoints.map((d) => ({ description: d }))}
            />
          )}
        </div>
        <div slot="tab-citations" className="tab-component__content">
          {entry && entry.citations && (
            <>
              <CitationList
                citations={entry.citations}
                label={globalConfig.CITATIONS_LABEL}
                selectedCitation={selectedCitation}
                onCitationClick={handleCitationClick}
              />
              {selectedCitation && (
                <DocumentPreviewer
                  url={`${apiUrl}/content/${selectedCitation.text}`}
                />
              )}
            </>
          )}
        </div>
      </TabComponent>
    );
  };

  return (
    <div className={`chat-component ${theme}`} style={customStyles}>
      <div ref={overlayRef} className="overlay"></div>
      <section ref={containerWrapperRef} className="chat__containerWrapper">
        {isCustomBranding && !isChatStarted && (
          <ChatStage
            svgIcon={iconLogo}
            pagetitle={globalConfig.BRANDING_HEADLINE}
            url={globalConfig.BRANDING_URL}
          />
        )}
        
        <section className="chat__container">
          {isChatStarted && (
            <div className="chat__header--thread">
              {interactionModel === 'chat' && 
                chatHistoryController.renderHistoryButton({ disabled: isDisabled })
              }
              <ChatActionButton
                label={globalConfig.RESET_CHAT_BUTTON_TITLE}
                actionId="chat-reset-button"
                onClick={resetCurrentChat}
                svgIcon={iconDelete}
              />
            </div>
          )}

          {isChatStarted && chatHistoryController.showChatHistory && (
            <div className="chat-history__container">
              <ChatThreadComponent
                chatThread={chatHistoryController.chatHistory}
                actionButtons={[]}
                isDisabled={isDisabled}
                isProcessingResponse={chatController.isProcessingResponse}
                selectedCitation={selectedCitation}
                isCustomBranding={isCustomBranding}
                svgIcon={iconLogo}
                onActionButtonClick={handleChatEntryActionButtonClick}
                onCitationClick={handleCitationClick}
                onFollowupClick={handleQuestionInputClick}
              />
              <div className="chat-history__footer">
                <span dangerouslySetInnerHTML={{ __html: iconUp }} />
                {globalConfig.CHAT_HISTORY_FOOTER_TEXT.replace(
                  globalConfig.CHAT_MAX_COUNT_TAG,
                  MAX_CHAT_HISTORY,
                )}
                <span dangerouslySetInnerHTML={{ __html: iconUp }} />
              </div>
            </div>
          )}

          {isChatStarted && (
            <ChatThreadComponent
              chatThread={chatThread}
              actionButtons={[
                {
                  id: 'chat-show-thought-process',
                  label: globalConfig.SHOW_THOUGH_PROCESS_BUTTON_LABEL_TEXT,
                  svgIcon: iconLightBulb,
                  isDisabled: isShowingThoughtProcess,
                },
              ]}
              isDisabled={isDisabled}
              isProcessingResponse={chatController.isProcessingResponse}
              selectedCitation={selectedCitation}
              isCustomBranding={isCustomBranding}
              svgIcon={iconLogo}
              onActionButtonClick={handleChatEntryActionButtonClick}
              onCitationClick={handleCitationClick}
              onFollowupClick={handleQuestionInputClick}
            />
          )}

          {chatController.isAwaitingResponse && (
            <LoadingIndicator label={globalConfig.LOADING_INDICATOR_TEXT} />
          )}

          <div className="chat__container">
            {isDefaultPromptsEnabled && (
              <TeaserListComponent
                heading={interactionModel === 'chat' ? teaserListTexts.HEADING_CHAT : teaserListTexts.HEADING_ASK}
                clickable={true}
                actionLabel={teaserListTexts.TEASER_CTA_LABEL}
                onTeaserClick={handleQuestionInputClick}
                teasers={teaserListTexts.DEFAULT_PROMPTS}
              />
            )}
          </div>

          <form
            className={`form__container ${inputPosition === 'sticky' ? 'form__container-sticky' : ''}`}
            onSubmit={handleUserChatSubmit}
          >
            <div className="chatbox__container container-col container-row">
              <div className="chatbox__input-container display-flex-grow container-row">
                <input
                  ref={questionInputRef}
                  className="chatbox__input display-flex-grow"
                  data-testid="question-input"
                  placeholder={globalConfig.CHAT_INPUT_PLACEHOLDER}
                  aria-labelledby="chatbox-label"
                  name="chatbox"
                  type="text"
                  disabled={isDisabled}
                  autoComplete="off"
                  onChange={handleOnInputChange}
                />
                {!isResetInput && <VoiceInputButton onVoiceInput={handleVoiceInput} />}
              </div>
              {renderChatOrCancelButton()}
              <button
                title={globalConfig.RESET_BUTTON_TITLE_TEXT}
                className="chatbox__button--reset"
                style={{ display: isResetInput ? 'block' : 'none' }}
                type="button"
                onClick={resetInputField}
              >
                {globalConfig.RESET_BUTTON_LABEL_TEXT}
              </button>
            </div>

            {!isDefaultPromptsEnabled && (
              <div className="chat__containerFooter">
                <button type="button" onClick={showDefaultPrompts} className="defaults__span button">
                  {globalConfig.DISPLAY_DEFAULT_PROMPTS_BUTTON}
                </button>
              </div>
            )}
          </form>
        </section>

        {isShowingThoughtProcess && (
          <aside className="aside" data-testid="aside-thought-process">
            <div className="aside__header">
              <ChatActionButton
                label={globalConfig.HIDE_THOUGH_PROCESS_BUTTON_LABEL_TEXT}
                actionId="chat-hide-thought-process"
                onClick={collapseAside}
                svgIcon={iconClose}
              />
            </div>
            {renderChatEntryTabContent(selectedChatEntry)}
          </aside>
        )}
      </section>
    </div>
  );
};

export default ChatComponent;