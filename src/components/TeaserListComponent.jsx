import React from 'react';

const TeaserListComponent = ({
  teasers = [],
  heading,
  actionLabel,
  alwaysRow = false,
  clickable = false,
  onTeaserClick
}) => {
  const handleTeaserClick = (teaser, event) => {
    event?.preventDefault();
    onTeaserClick?.(teaser.description);
  };

  const renderClickableTeaser = (teaser) => (
    <a
      role="button"
      href="#"
      data-testid="default-question"
      onClick={(event) => handleTeaserClick(teaser, event)}
      className="teaser-clickable"
    >
      {teaser.description}
      <span className="teaser-click-label">{actionLabel}</span>
    </a>
  );

  return (
    <div className="teaser-list-container">
      {heading && <h1 className="headline">{heading}</h1>}
      <ul className={`teaser-list ${alwaysRow ? 'always-row' : ''}`}>
        {teasers.map((teaser, index) => (
          <li key={index} className="teaser-list-item">
            {clickable ? renderClickableTeaser(teaser) : teaser.description}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TeaserListComponent;