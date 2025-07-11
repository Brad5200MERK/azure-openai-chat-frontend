import React from 'react';
import { createRoot } from 'react-dom/client';
import ChatComponent from './components/ChatComponent.jsx';
import './styles/global.css';

const App = () => {
  return (
    <main className="chat__main">
      <h1>Welcome to this Azure OpenAI JavaScript Chat Sample</h1>
      <section className="chat__container">
        <ChatComponent
          title="Ask anything or try an example"
          inputPosition="sticky"
          interactionModel="chat"
          apiUrl={import.meta.env.VITE_SEARCH_API_URI || 'http://localhost:3000'}
          useStream={true}
          approach="rrr"
          overrides={{
            retrieval_mode: "hybrid",
            top: 3,
            semantic_ranker: true,
            semantic_captions: false,
            exclude_category: "",
            prompt_template: "",
            prompt_template_prefix: "",
            prompt_template_suffix: "",
            suggest_followup_questions: true
          }}
          customStyles={{
            AccentHigh: "#692b61",
            AccentLight: "#f6d5f2",
            AccentDark: "#5e3c7d",
            TextColor: "#123f58",
            BackgroundColor: "#e3e3e3",
            ForegroundColor: "#4e5288",
            FormBackgroundColor: "#f5f5f5",
            BorderRadius: "10px",
            BorderWidth: "3px",
            FontBaseSize: "14px"
          }}
          isCustomBranding={true}
          theme="light"
        />
      </section>
    </main>
  );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);