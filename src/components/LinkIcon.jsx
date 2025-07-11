import React from 'react';

const LinkIcon = ({ label = '', svgIcon, url }) => {
  return (
    <a title={label} href={url} target="_blank" rel="noopener noreferrer" className="link-icon">
      <span dangerouslySetInnerHTML={{ __html: svgIcon }} />
    </a>
  );
};

export default LinkIcon;