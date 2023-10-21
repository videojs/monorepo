import { testMPD } from '../../test/dash-parser/examples/mpd';

const PARSE_EMPTY_SPACE_STATE = 1;
const PARSE_TAG_KEY_STATE = 2;
const PARSE_ATTRIBUTE_KEY_STATE = 3;
const PARSE_TAG_BODY_STATE = 4;
const PARSE_ATTRIBUTE_VALUE_STATE = 5;
const PARSE_QUOTED_STRING_ATTRIBUTE_VALUE = 6;

export interface TagInfo {
  tagKey: string;
  tagValue: string | null;
  tagAttributes: Record<string, string>;
}

type TagInfoCallback = (tagInfo: TagInfo, parentTagInfo: TagInfo | null) => void;

export type StateMachineTransition = (char: string) => void;

export default function createStateMachine(tagInfoCallback: TagInfoCallback): StateMachineTransition {
  let currentState = PARSE_EMPTY_SPACE_STATE;

  let currentTagKey = '';
  let currentTagValue = '';
  let currentAttributeKey = '';
  let currentAttributeValue = '';
  let currentTagAttributeKeyValueMap: Record<string, string> = {};

  // start = parse-empty-space-state
  // parse-empty-space-state -> parse-tag-name (if encounter '<')
  // parse-empty-space-state -> parse-empty-space-state (if encounter any char)

  // parse-tag-name -> parse-empty-space-state (if encounter '?') // xml declaration
  // parse-tag-name -> parse-empty-space-state (if encounter '!') // comment
  // parse-tag-name -> parse-empty-space-state (if encounter '/') // closing tag
  // parse-tag-name -> parse-tag-attribute-key (if encounter ' ')
  // parse-tag-name -> parse-tag-body (if encounter '>')
  // if encounter new tag name and we have previous value, just expose it and clear internal state

  // parse-tag-attribute-key --> parse-tag-attribute-value (if encounter '=')

  // parse-tag-attribute-value --> parse-tag-attribute-quoted-string-value (if encounter '"')

  // parse-tag-attribute-quoted-string-value -> parse-tag-name (if encounter '"')

  // parse-tag-body --> parse-empty-space-state (if encounter ' ')
  // parse-tag-body --> parse-tag-name (if encounter '<')

  const stateMachine: Record<number, (char: string) => void> = {
    [PARSE_EMPTY_SPACE_STATE]: (char) => {
      if (char === '<') {
        currentState = PARSE_TAG_KEY_STATE;

        // TODO: pass in parent node here
        if (currentTagKey) {
          tagInfoCallback({
            tagKey: currentTagKey,
            tagValue: currentTagValue || null,
            tagAttributes: currentTagAttributeKeyValueMap
          }, null);
          currentTagKey = '';
          currentTagValue = '';
          currentTagAttributeKeyValueMap = {};
        }
      }
    },
    [PARSE_TAG_KEY_STATE]: (char) => {
      if (char === '?') {
        currentState = PARSE_EMPTY_SPACE_STATE;
        return;
      }

      if (char === '!') {
        currentState = PARSE_EMPTY_SPACE_STATE;
        return;
      }

      if (char === '/') {
        currentState = PARSE_EMPTY_SPACE_STATE;
        return;
      }

      if (char === ' ') {
        currentState = PARSE_ATTRIBUTE_KEY_STATE;
        return;
      }

      if (char === '>') {
        currentState = PARSE_TAG_BODY_STATE;
        return;
      }

      currentTagKey += char;
    },
    [PARSE_ATTRIBUTE_KEY_STATE]: (char) => {
      if (char === '=') {
        currentState = PARSE_ATTRIBUTE_VALUE_STATE;
        return;
      }

      currentAttributeKey += char;
    },
    [PARSE_ATTRIBUTE_VALUE_STATE]: (char) => {
      if (char === '"') {
        currentState = PARSE_QUOTED_STRING_ATTRIBUTE_VALUE;
      }
    },
    [PARSE_QUOTED_STRING_ATTRIBUTE_VALUE]: (char) => {
      if (char === '"') {
        currentState = PARSE_TAG_KEY_STATE;
        currentTagAttributeKeyValueMap[currentAttributeKey] = currentAttributeValue;
        currentAttributeKey = '';
        currentAttributeValue = '';
        return;
      }

      currentAttributeValue += char;
    },
    [PARSE_TAG_BODY_STATE]: (char) => {
      if (char === '\n') {
        currentState = PARSE_EMPTY_SPACE_STATE;
        return;
      }

      if (char === '<') {
        currentState = PARSE_TAG_KEY_STATE;

        if (currentTagKey) {
          tagInfoCallback(currentTagKey, currentTagValue || null, currentTagAttributeKeyValueMap);
          currentTagKey = '';
          currentTagValue = '';
          currentTagAttributeKeyValueMap = {};
        }
        return;
      }

      currentTagValue += char;
    },
  };

  return (char: string) => {
    stateMachine[currentState](char);
  };
}

// TODO: add paren node support

const test = (): void => {
  const stateMachine = createStateMachine((tagName, tagValue, tagAttributes) => {
    // eslint-disable-next-line no-console
    console.log('tagName: ', tagName, ' tagValue: ', tagValue, ' tagAttributes: ', tagAttributes);
  });

  for (const char of testMPD) {
    stateMachine(char);
  }
};

test();
