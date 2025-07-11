import React from 'react';
import LinkIcon from './LinkIcon.jsx';

const ChatStage = ({ pagetitle, url, svgIcon }) => {
  return (
    <header className="chat-stage__header" data-testid="chat-branding">
      <LinkIcon url={url} svgIcon={svgIcon} />
      <h1 className="chat-stage__hl">{pagetitle}</h1>
    </header>
  );
};

export default ChatStage;