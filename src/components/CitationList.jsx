import React from 'react';

const CitationList = ({
  label,
  citations = [],
  selectedCitation,
  onCitationClick
}) => {
  const handleCitationClick = (citation, event) => {
    event.preventDefault();
    onCitationClick?.(citation);
  };

  const compareCitation = (citationA, citationB) => {
    return citationA && citationB && citationA.text === citationB.text;
  };

  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <div className="citation-list">
      <ol className="items__list">
        {label && <h3 className="subheadline--small">{label}</h3>}
        {citations.map((citation, index) => (
          <li 
            key={index}
            className={`items__listItem ${compareCitation(citation, selectedCitation) ? 'active' : ''}`}
          >
            <a
              className="items__link"
              href="#"
              data-testid="citation"
              onClick={(event) => handleCitationClick(citation, event)}
            >
              {citation.ref}. {citation.text}
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default CitationList;