import React from 'react';

const ChatActionButton = ({
  label,
  svgIcon,
  isDisabled = false,
  actionId,
  tooltip,
  onClick
}) => {
  return (
    <button
      title={label}
      data-testid={actionId}
      disabled={isDisabled}
      onClick={onClick}
      className="chat-action-button"
    >
      <span>{tooltip ?? label}</span>
      <span dangerouslySetInnerHTML={{ __html: svgIcon }} />
    </button>
  );
};

export default ChatActionButton;