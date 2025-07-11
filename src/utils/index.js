export function processText(inputText, arrays) {
  const nextQuestionMatch = `Next questions:|<<([^>]+)>>`;
  const findCitations = /\[(.*?)]/g;
  const findFollowingSteps = /:(.*?)(?:Follow-up questions:|Next questions:|<<|$)/s;
  const findNextQuestions = /Next Questions:(.*?)$/s;
  const findQuestionsbyDoubleArrow = /<<([^<>]+)>>/g;
  const findNumberedItems = /^\d+\.\s/;
  
  const citation = {};
  let citations = [];
  let referenceCounter = 1;
  
  let replacedText = inputText.replace(findCitations, (_match, capture) => {
    const citationText = capture.trim();
    if (!citation[citationText]) {
      citation[citationText] = referenceCounter++;
    }
    return `<sup class="citation">${citation[citationText]}</sup>`;
  });
  
  citations = Object.keys(citation).map((text, index) => ({
    ref: index + 1,
    text,
  }));
  arrays[0] = citations;

  const hasNextQuestions = replacedText.includes(nextQuestionMatch);
  const followingStepsMatch = replacedText.match(findFollowingSteps);
  const followingStepsText = followingStepsMatch ? followingStepsMatch[1].trim() : '';
  const followingSteps = followingStepsText.split('\n').filter(Boolean);
  const cleanFollowingSteps = followingSteps.map((item) => {
    return item.replace(findNumberedItems, '');
  });
  arrays[1] = cleanFollowingSteps;

  const nextRegex = hasNextQuestions ? findNextQuestions : findQuestionsbyDoubleArrow;
  const nextQuestionsMatch = replacedText.match(nextRegex) ?? [];
  let nextQuestions = [];
  nextQuestions = cleanUpFollowUp([...nextQuestionsMatch]);

  const stepsIndex = replacedText.indexOf('s:');
  replacedText = stepsIndex !== -1 ? inputText.substring(0, stepsIndex + 6) : inputText;

  arrays[2] = nextQuestions;
  return { replacedText, arrays };
}

export function cleanUpFollowUp(followUpList) {
  if (followUpList && followUpList.length > 0 && followUpList[0].startsWith('<<')) {
    followUpList = followUpList.map((followUp) => followUp.replace('<<', '').replace('>>', ''));
  }
  return followUpList;
}

export function getTimestamp() {
  return new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  });
}

export function chatEntryToString(entry) {
  const message = entry.text
    .map((textEntry) => textEntry.value + '\n\n' + textEntry.followingSteps?.map((s, i) => `${i + 1}.` + s).join('\n'))
    .join('\n\n')
    .replaceAll(/<sup[^>]*>(.*?)<\/sup>/g, '');

  return message;
}

export class ChatResponseError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

export function newListWithEntryAtIndex(list, index, entry) {
  return [...list.slice(0, index), entry, ...list.slice(index + 1)];
}