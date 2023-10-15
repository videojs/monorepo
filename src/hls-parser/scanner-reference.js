const testPlaylist = `#EXTM3U

#EXT-X-TARGETDURATION:11
#EXT-X-VERSION:4
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:9.9766,\t
#EXT-X-BYTERANGE:678116@0
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="bipbop_audio",LANGUAGE="eng",NAME="BipBop Audio 1",AUTOSELECT=YES,DEFAULT=YES
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="bipbop_audio",LANGUAGE="eng",NAME="BipBop Audio 2",AUTOSELECT=NO,DEFAULT=NO,URI="alternate_audio_aac_sinewave/prog_index.m3u8"

#EXT-X-INDEPENDENT-SEGMENTS

#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="English",DEFAULT=YES,AUTOSELECT=YES,FORCED=NO,LANGUAGE="en",CHARACTERISTICS="public.accessibility.transcribes-spoken-dialog, public.accessibility.describes-music-and-sound",URI="subtitles/eng/prog_index.m3u8"
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="English (Forced)",DEFAULT=NO,AUTOSELECT=NO,FORCED=YES,LANGUAGE="en",URI="subtitles/eng_forced/prog_index.m3u8"
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="Français",DEFAULT=NO,AUTOSELECT=YES,FORCED=NO,LANGUAGE="fr",CHARACTERISTICS="public.accessibility.transcribes-spoken-dialog, public.accessibility.describes-music-and-sound",URI="subtitles/fra/prog_index.m3u8"
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="Français (Forced)",DEFAULT=NO,AUTOSELECT=NO,FORCED=YES,LANGUAGE="fr",URI="subtitles/fra_forced/prog_index.m3u8"
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="Español",DEFAULT=NO,AUTOSELECT=YES,FORCED=NO,LANGUAGE="es",CHARACTERISTICS="public.accessibility.transcribes-spoken-dialog, public.accessibility.describes-music-and-sound",URI="subtitles/spa/prog_index.m3u8"
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="Español (Forced)",DEFAULT=NO,AUTOSELECT=NO,FORCED=YES,LANGUAGE="es",URI="subtitles/spa_forced/prog_index.m3u8"
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="日本語",DEFAULT=NO,AUTOSELECT=YES,FORCED=NO,LANGUAGE="ja",CHARACTERISTICS="public.accessibility.transcribes-spoken-dialog, public.accessibility.describes-music-and-sound",URI="subtitles/jpn/prog_index.m3u8"
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="日本語 (Forced)",DEFAULT=NO,AUTOSELECT=NO,FORCED=YES,LANGUAGE="ja",URI="subtitles/jpn_forced/prog_index.m3u8"


#EXT-X-STREAM-INF:BANDWIDTH=263851,CODECS="mp4a.40.2, avc1.4d400d",RESOLUTION=416x234,AUDIO="bipbop_audio",SUBTITLES="subs"
gear1/prog_index.m3u8
#EXT-X-I-FRAME-STREAM-INF:BANDWIDTH=28451,CODECS="avc1.4d400d",URI="gear1/iframe_index.m3u8"

#EXT-X-STREAM-INF:BANDWIDTH=577610,CODECS="mp4a.40.2, avc1.4d401e",RESOLUTION=640x360,AUDIO="bipbop_audio",SUBTITLES="subs"
gear2/prog_index.m3u8
#EXT-X-I-FRAME-STREAM-INF:BANDWIDTH=181534,CODECS="avc1.4d401e",URI="gear2/iframe_index.m3u8"

#EXT-X-STREAM-INF:BANDWIDTH=915905,CODECS="mp4a.40.2, avc1.4d401f",RESOLUTION=960x540,AUDIO="bipbop_audio",SUBTITLES="subs"
gear3/prog_index.m3u8
#EXT-X-I-FRAME-STREAM-INF:BANDWIDTH=297056,CODECS="avc1.4d401f",URI="gear3/iframe_index.m3u8"

#EXT-X-STREAM-INF:BANDWIDTH=1030138,CODECS="mp4a.40.2, avc1.4d401f",RESOLUTION=1280x720,AUDIO="bipbop_audio",SUBTITLES="subs"
gear4/prog_index.m3u8
#EXT-X-I-FRAME-STREAM-INF:BANDWIDTH=339492,CODECS="avc1.4d401f",URI="gear4/iframe_index.m3u8"

#EXT-X-STREAM-INF:BANDWIDTH=1924009,CODECS="mp4a.40.2, avc1.4d401f",RESOLUTION=1920x1080,AUDIO="bipbop_audio",SUBTITLES="subs"
gear5/prog_index.m3u8
#EXT-X-I-FRAME-STREAM-INF:BANDWIDTH=669554,CODECS="avc1.4d401f",URI="gear5/iframe_index.m3u8"

#EXT-X-STREAM-INF:BANDWIDTH=41457,CODECS="mp4a.40.2",AUDIO="bipbop_audio",SUBTITLES="subs"
gear0/prog_index.m3u8
`;

const PARSE_EMPTY_SPACE_STATE = 'PARSE_EMPTY_SPACE_STATE'; // 1
const PARSE_TAG_KEY_STATE = 'PARSE_TAG_KEY_STATE'; // 2
const PARSE_URL_STATE = 'PARSE_URL_STATE'; // 3
const PARSE_TAG_VALUE_STATE = 'PARSE_TAG_VALUE_STATE'; // 4
const PARSE_ATTRIBUTE_KEY_STATE = 'PARSE_ATTRIBUTE_KEY_STATE'; // 5
const PARSE_ATTRIBUTE_VALUE_STATE = 'PARSE_ATTRIBUTE_VALUE_STATE'; // 6
const PARSE_QUOTED_STRING_ATTRIBUTE_VALUE = 'PARSE_QUOTED_STRING_ATTRIBUTE_VALUE'; // 7

function scanner(playlist, lineInfoCallback, urlCallback) {
  let currentState = PARSE_EMPTY_SPACE_STATE;

  let currentTagKey = '';
  let currentTagValue = '';
  let currentUrl = '';
  let currentAttributeKey = '';
  let currentAttributeValue = '';
  let currentTagAttributeKeyValueMap = {};

  for (let i = 0; i < playlist.length; i++) {
    const char = playlist[i];

    // State Machine:

    if (currentState === PARSE_EMPTY_SPACE_STATE) {
      // PARSE_EMPTY_SPACE_STATE --> PARSE_EMPTY_SPACE_STATE
      if (char === '\n') {
        currentState === PARSE_EMPTY_SPACE_STATE;
        continue;
      }
      // PARSE_EMPTY_SPACE_STATE --> PARSE_TAG_KEY_STATE
      if (char === '#') {
        currentState = PARSE_TAG_KEY_STATE;
        continue;
      }
      // PARSE_EMPTY_SPACE_STATE --> PARSE_URL_STATE
      currentState = PARSE_URL_STATE;
    }

    if (currentState === PARSE_TAG_KEY_STATE) {
      // PARSE_TAG_KEY_STATE --> PARSE_EMPTY_SPACE_STATE
      if (char === '\n') {
        currentState = PARSE_EMPTY_SPACE_STATE;
        lineInfoCallback(currentTagKey, null, null);
        currentTagKey = '';
        continue;
      }
      // PARSE_TAG_KEY_STATE --> PARSE_TAG_VALUE_STATE
      if (char === ':') {
        currentState = PARSE_TAG_VALUE_STATE;
        continue;
      }
      // Accumulate tag key:
      currentTagKey += char;
      continue;
    }

    if (currentState === PARSE_URL_STATE) {
      // PARSE_URL_STATE --> PARSE_EMPTY_SPACE_STATE
      if (char === '\n') {
        currentState = PARSE_EMPTY_SPACE_STATE;
        urlCallback(currentUrl);
        currentUrl = '';
        continue;
      }
      // Accumulate url:
      currentUrl += char;
      continue;
    }

    if (currentState === PARSE_TAG_VALUE_STATE) {
      // PARSE_TAG_VALUE_STATE --> PARSE_EMPTY_SPACE_STATE
      if (char === '\n') {
        currentState = PARSE_EMPTY_SPACE_STATE;
        lineInfoCallback(currentTagKey, currentTagValue, null);
        currentTagKey = '';
        currentTagValue = '';
        continue;
      }
      // PARSE_TAG_VALUE_STATE --> PARSE_ATTRIBUTE_VALUE_STATE
      if (char === '=') {
        currentAttributeKey = currentTagValue;
        currentTagValue = '';
        currentState = PARSE_ATTRIBUTE_VALUE_STATE;
        continue;
      }
      // Accumulate tag value:
      currentTagValue += char;
      continue;
    }

    if (currentState === PARSE_ATTRIBUTE_VALUE_STATE) {
      // PARSE_ATTRIBUTE_VALUE_STATE --> PARSE_EMPTY_SPACE_STATE
      if (char === '\n') {
        currentState = PARSE_EMPTY_SPACE_STATE;
        currentTagAttributeKeyValueMap[currentAttributeKey] = currentAttributeValue;
        lineInfoCallback(currentTagKey, null, currentTagAttributeKeyValueMap);
        currentTagKey = '';
        currentTagAttributeKeyValueMap = {};
        currentAttributeKey = '';
        currentAttributeValue = '';
        continue;
      }
      // PARSE_ATTRIBUTE_VALUE_STATE --> PARSE_QUOTED_STRING_ATTRIBUTE_VALUE
      if (char === '"') {
        currentState = PARSE_QUOTED_STRING_ATTRIBUTE_VALUE;
        continue;
      }
      // PARSE_ATTRIBUTE_VALUE_STATE --> PARSE_ATTRIBUTE_KEY_STATE
      if (char === ',') {
        currentState = PARSE_ATTRIBUTE_KEY_STATE;
        currentTagAttributeKeyValueMap[currentAttributeKey] = currentAttributeValue;
        currentAttributeKey = '';
        currentAttributeValue = '';
        continue;
      }
      // Accumulate attribute value:
      currentAttributeValue += char;
      continue;
    }

    if (currentState === PARSE_QUOTED_STRING_ATTRIBUTE_VALUE) {
      // PARSE_QUOTED_STRING_ATTRIBUTE_VALUE --> PARSE_ATTRIBUTE_VALUE_STATE
      if (char === '"') {
        currentState = PARSE_ATTRIBUTE_VALUE_STATE;
        continue;
      }
      // Accumulate attribute value:
      currentAttributeValue += char;
      continue;
    }

    if (currentState === PARSE_ATTRIBUTE_KEY_STATE) {
      // PARSE_ATTRIBUTE_KEY_STATE --> PARSE_EMPTY_SPACE_STATE
      if (char === '\n' || char === '\t') {
        currentState = PARSE_EMPTY_SPACE_STATE;
        lineInfoCallback(currentTagKey, null, currentTagAttributeKeyValueMap);
        currentTagKey = '';
        currentTagAttributeKeyValueMap = {};
        continue;
      }

      // PARSE_ATTRIBUTE_KEY_STATE --> PARSE_ATTRIBUTE_VALUE_STATE
      if (char === '=') {
        currentState = PARSE_ATTRIBUTE_VALUE_STATE;
        continue;
      }

      currentAttributeKey += char;
      continue;
    }

    // End State Machine
  }
}

scanner(
  testPlaylist,
  (tagKey, tagValue, tagAttributes) => {
    console.log(`TagKey: ${tagKey}, TagValue: ${tagValue}, TagAttributes: `, tagAttributes);
  },
  (url) => console.log(`Url: ${url}`)
);
