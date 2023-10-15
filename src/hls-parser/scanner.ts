const PARSE_EMPTY_SPACE_STATE = 1;
const PARSE_TAG_KEY_STATE = 2;
const PARSE_URL_STATE = 3;
const PARSE_TAG_VALUE_STATE = 4;
const PARSE_ATTRIBUTE_KEY_STATE = 5;
const PARSE_ATTRIBUTE_VALUE_STATE = 6;
const PARSE_QUOTED_STRING_ATTRIBUTE_VALUE = 7;

type TagInfoCallback = (tagKey: string, tagValue: string | null, tagAttributes: Record<string, string>) => void;
type UriInfoCallback = (url: string) => void;

export default function scanner(
  playlist: string,
  tagInfoCallback: TagInfoCallback,
  uriInfoCallback: UriInfoCallback
): void {
  const length = playlist.length;
  let currentState = PARSE_EMPTY_SPACE_STATE;

  let currentTagKey = '';
  let currentTagValue = '';
  let currentUrl = '';
  let currentAttributeKey = '';
  let currentAttributeValue = '';
  let currentTagAttributeKeyValueMap: Record<string, string> = {};

  const stateMachine: Record<number, (char: string) => void> = {
    [PARSE_EMPTY_SPACE_STATE]: (char) => {
      // PARSE_EMPTY_SPACE_STATE --> PARSE_EMPTY_SPACE_STATE
      if (char === '\n') {
        return;
      }
      // PARSE_EMPTY_SPACE_STATE --> PARSE_TAG_KEY_STATE
      if (char === '#') {
        currentState = PARSE_TAG_KEY_STATE;
        return;
      }
      // PARSE_EMPTY_SPACE_STATE --> PARSE_URL_STATE
      currentState = PARSE_URL_STATE;
      // Accumulate first char of the url:
      currentUrl += char;
    },
    [PARSE_TAG_KEY_STATE]: (char) => {
      // PARSE_TAG_KEY_STATE --> PARSE_EMPTY_SPACE_STATE
      if (char === '\n') {
        currentState = PARSE_EMPTY_SPACE_STATE;
        tagInfoCallback(currentTagKey, null, {});
        currentTagKey = '';
        return;
      }
      // PARSE_TAG_KEY_STATE --> PARSE_TAG_VALUE_STATE
      if (char === ':') {
        currentState = PARSE_TAG_VALUE_STATE;
        return;
      }
      // Accumulate tag key:
      currentTagKey += char;
    },
    [PARSE_URL_STATE]: (char) => {
      // PARSE_URL_STATE --> PARSE_EMPTY_SPACE_STATE
      if (char === '\n') {
        currentState = PARSE_EMPTY_SPACE_STATE;
        uriInfoCallback(currentUrl);
        currentUrl = '';
        return;
      }
      // Accumulate url:
      currentUrl += char;
    },
    [PARSE_TAG_VALUE_STATE]: (char) => {
      // PARSE_TAG_VALUE_STATE --> PARSE_EMPTY_SPACE_STATE
      if (char === '\n') {
        currentState = PARSE_EMPTY_SPACE_STATE;
        tagInfoCallback(currentTagKey, currentTagValue, {});
        currentTagKey = '';
        currentTagValue = '';
        return;
      }
      // PARSE_TAG_VALUE_STATE --> PARSE_ATTRIBUTE_VALUE_STATE
      if (char === '=') {
        currentAttributeKey = currentTagValue;
        currentTagValue = '';
        currentState = PARSE_ATTRIBUTE_VALUE_STATE;
        return;
      }
      // Accumulate tag value:
      currentTagValue += char;
    },
    [PARSE_ATTRIBUTE_VALUE_STATE]: (char) => {
      // PARSE_ATTRIBUTE_VALUE_STATE --> PARSE_EMPTY_SPACE_STATE
      if (char === '\n') {
        currentState = PARSE_EMPTY_SPACE_STATE;
        currentTagAttributeKeyValueMap[currentAttributeKey] = currentAttributeValue;
        tagInfoCallback(currentTagKey, null, currentTagAttributeKeyValueMap);
        currentTagKey = '';
        currentTagAttributeKeyValueMap = {};
        currentAttributeKey = '';
        currentAttributeValue = '';
        return;
      }
      // PARSE_ATTRIBUTE_VALUE_STATE --> PARSE_QUOTED_STRING_ATTRIBUTE_VALUE
      if (char === '"') {
        currentState = PARSE_QUOTED_STRING_ATTRIBUTE_VALUE;
        return;
      }
      // PARSE_ATTRIBUTE_VALUE_STATE --> PARSE_ATTRIBUTE_KEY_STATE
      if (char === ',') {
        currentState = PARSE_ATTRIBUTE_KEY_STATE;
        currentTagAttributeKeyValueMap[currentAttributeKey] = currentAttributeValue;
        currentAttributeKey = '';
        currentAttributeValue = '';
        return;
      }
      // Accumulate attribute value:
      currentAttributeValue += char;
    },
    [PARSE_QUOTED_STRING_ATTRIBUTE_VALUE]: (char) => {
      // PARSE_QUOTED_STRING_ATTRIBUTE_VALUE --> PARSE_ATTRIBUTE_VALUE_STATE
      if (char === '"') {
        currentState = PARSE_ATTRIBUTE_VALUE_STATE;
        return;
      }
      // Accumulate attribute value:
      currentAttributeValue += char;
    },
    [PARSE_ATTRIBUTE_KEY_STATE]: (char) => {
      // PARSE_ATTRIBUTE_KEY_STATE --> PARSE_EMPTY_SPACE_STATE
      if (char === '\n') {
        currentState = PARSE_EMPTY_SPACE_STATE;
        tagInfoCallback(currentTagKey, null, currentTagAttributeKeyValueMap);
        currentTagKey = '';
        currentTagAttributeKeyValueMap = {};
        return;
      }

      // PARSE_ATTRIBUTE_KEY_STATE --> PARSE_ATTRIBUTE_VALUE_STATE
      if (char === '=') {
        currentState = PARSE_ATTRIBUTE_VALUE_STATE;
        return;
      }

      currentAttributeKey += char;
    },
  };

  for (let i = 0; i < length; i++) {
    stateMachine[currentState](playlist[i]);
  }
}
