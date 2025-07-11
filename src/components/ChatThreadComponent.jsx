import React, { useState, useRef, useEffect } from 'react';
import { globalConfig } from '../config/globalConfig.js';
import { chatEntryToString } from '../utils/index.js';
import iconSuccess from '../svg/success-icon.svg?raw';
import iconCopyToClipboard from '../svg/copy-icon.svg?raw';
import iconQuestion from '../svg/bubblequestion-icon.svg?raw';
import CitationList from './CitationList.jsx';
import ChatActionButton from './ChatActionButton.jsx';

const ChatThreadComponent = ({
  chatThread = [],
  actionButtons = [],
  isDisabled = false,
  isProcessingResponse = false,
  selectedCitation,
  onActionButtonClick,
  onCitationClick,
  onFollowupClick
}) => {
  const [isResponseCopied, setIsResponseCopied] = useState(false);
  const chatFooterRef = useRef(null);

  const copyResponseToClipboard = (entry) => {
    const response = chatEntryToString(entry);
    navigator.clipboard.writeText(response);
    setIsResponseCopied(true);
    setTimeout(() => setIsResponseCopied(false), 2000);
  };

  const actionButtonClicked = (actionButton, entry, event) => {
    event.preventDefault();
    onActionButtonClick?.(actionButton.id, entry);
  };

  const debounceScrollIntoView = () => {
    let timeout = 0;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      if (chatFooterRef.current) {
        chatFooterRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 500);
  };

  useEffect(() => {
    if (isProcessingResponse) {
      debounceScrollIntoView();
    }
  }, [isProcessingResponse]);

  const handleFollowupQuestionClick = (question, entry, event) => {
    event.preventDefault();
    onFollowupClick?.(question);
  };

  const handleCitationClick = (citation, entry, event) => {
    event.preventDefault();
    onCitationClick?.(citation, entry);
  };

  const renderResponseActions = (entry) => (
    <header className="chat__header">
      <div className="chat__header--button">
        {actionButtons.map((actionButton) => (
          <ChatActionButton
            key={actionButton.id}
            label={actionButton.label}
            svgIcon={actionButton.svgIcon}
            isDisabled={actionButton.isDisabled}
            actionId={actionButton.id}
            onClick={(event) => actionButtonClicked(actionButton, entry, event)}
          />
        ))}
        <ChatActionButton
          label={globalConfig.COPY_RESPONSE_BUTTON_LABEL_TEXT}
          svgIcon={isResponseCopied ? iconSuccess : iconCopyToClipboard}
          isDisabled={isDisabled}
          actionId="copy-to-clipboard"
          tooltip={isResponseCopied
            ? globalConfig.COPIED_SUCCESSFULLY_MESSAGE
            : globalConfig.COPY_RESPONSE_BUTTON_LABEL_TEXT}
          onClick={() => copyResponseToClipboard(entry)}
        />
      </div>
    </header>
  );

  const renderTextEntry = (textEntry) => {
    const entries = [
      <p key="text" className="chat__txt--entry" dangerouslySetInnerHTML={{ __html: textEntry.value }} />
    ];

    if (textEntry.followingSteps && textEntry.followingSteps.length > 0) {
      entries.push(
        <ol key="steps" className="items__list steps">
          {textEntry.followingSteps.map((followingStep, index) => (
            <li key={index} className="items__listItem--step" dangerouslySetInnerHTML={{ __html: followingStep }} />
          ))}
        </ol>
      );
    }

    return <div className="chat_txt--entry-container">{entries}</div>;
  };

  const renderCitation = (entry) => {
    const citations = entry.citations;
    if (citations && citations.length > 0) {
      return (
        <div className="chat__citations">
          <CitationList
            citations={citations}
            label={globalConfig.CITATIONS_LABEL}
            selectedCitation={selectedCitation}
            onCitationClick={(citation) => handleCitationClick(citation, entry)}
          />
        </div>
      );
    }
    return null;
  };

  const renderFollowupQuestions = (entry) => {
    const followupQuestions = entry.followupQuestions;
    if (followupQuestions && followupQuestions.length > 0) {
      return (
        <div className="items__listWrapper">
          <span dangerouslySetInnerHTML={{ __html: iconQuestion }} />
          <ul className="items__list followup">
            {followupQuestions.map((followupQuestion, index) => (
              <li key={index} className="items__listItem--followup">
                <a
                  className="items__link"
                  href="#"
                  data-testid="followUpQuestion"
                  onClick={(event) => handleFollowupQuestionClick(followupQuestion, entry, event)}
                >
                  {followupQuestion}
                </a>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    return null;
  };

  const renderError = (error) => (
    <p className="chat__txt error">{error.message}</p>
  );

  return (
    <div className="chat-thread">
      <ul className="chat__list" aria-live="assertive">
        {chatThread.map((message) => (
          <li key={message.id} className={`chat__listItem ${message.isUserMessage ? 'user-message' : ''}`}>
            <div className={`chat__txt ${message.isUserMessage ? 'user-message' : ''}`}>
              {!message.isUserMessage && renderResponseActions(message)}
              {message.text.map((textEntry, index) => (
                <div key={index}>{renderTextEntry(textEntry)}</div>
              ))}
              {renderCitation(message)}
              {renderFollowupQuestions(message)}
              {message.error && renderError(message.error)}
            </div>
            <p className="chat__txt--info">
              <span className="timestamp">{message.timestamp}</span>,
              <span className="user">{message.isUserMessage ? 'You' : globalConfig.USER_IS_BOT}</span>
            </p>
          </li>
        ))}
      </ul>
      <div ref={chatFooterRef} className="chat__footer">
        {/* Do not delete this element. It is used for auto-scrolling */}
      </div>
    </div>
  );
};

export default ChatThreadComponent;