import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import { globalConfig } from '../config/globalConfig.js';
import LoadingIndicator from './LoadingIndicator.jsx';

const DocumentPreviewer = ({ url }) => {
  const [previewContent, setPreviewContent] = useState(null);
  const [loading, setLoading] = useState(false);

  const retrieveMarkdown = async () => {
    if (url) {
      setLoading(true);
      try {
        const response = await fetch(url);
        const text = await response.text();
        const parsedContent = marked.parse(text);
        setPreviewContent(parsedContent);
      } catch (error) {
        console.error('Error fetching markdown:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (url && url.endsWith('.md')) {
      retrieveMarkdown();
    }
  }, [url]);

  const renderContent = () => {
    if (!url) return null;

    if (previewContent) {
      return <div dangerouslySetInnerHTML={{ __html: previewContent }} />;
    }

    return (
      <iframe 
        title="Preview" 
        src={url} 
        width="100%" 
        height="850px" 
        sandbox 
      />
    );
  };

  return (
    <div className="document-previewer">
      {loading ? (
        <LoadingIndicator label={globalConfig.LOADING_TEXT} />
      ) : (
        renderContent()
      )}
    </div>
  );
};

export default DocumentPreviewer;