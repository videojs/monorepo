import type { ParsedPlaylist } from '../types/parsedPlaylist';
import { TagProcessor } from './base.ts';
import { missingRequiredAttributeWarn } from '../utils/warn.ts';
import { EXT_X_PART_INF, EXT_X_SERVER_CONTROL, EXT_X_START } from '../consts/tags.ts';
import { parseBoolean } from '../utils/parse.ts';

export abstract class TagWithAttributesProcessor extends TagProcessor {
  protected abstract readonly requiredAttributes: Set<string>;

  process(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void {
    let isRequiredAttributedMissed = false;

    this.requiredAttributes.forEach((requiredAttribute) => {
      const hasRequiredAttribute = requiredAttribute in tagAttributes;

      if (!hasRequiredAttribute) {
        this.warnCallback(missingRequiredAttributeWarn(this.tag, requiredAttribute));
        isRequiredAttributedMissed = true;
      }
    });

    if (isRequiredAttributedMissed) {
      return;
    }

    return this.safeProcess(tagAttributes, playlist);
  }

  protected abstract safeProcess(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void;
}

export class ExtXStart extends TagWithAttributesProcessor {
  static TIME_OFFSET = 'TIME-OFFSET';
  static PRECISE = 'PRECISE';

  requiredAttributes = new Set([ExtXStart.TIME_OFFSET]);
  tag = EXT_X_START;

  safeProcess(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void {
    playlist.start = {
      timeOffset: Number(tagAttributes[ExtXStart.TIME_OFFSET]),
      precise: parseBoolean(tagAttributes[ExtXStart.PRECISE], false),
    };
  }
}

export class ExtXPartInf extends TagWithAttributesProcessor {
  static PART_TARGET = 'PART-TARGET';

  requiredAttributes = new Set([ExtXPartInf.PART_TARGET]);
  tag = EXT_X_PART_INF;

  safeProcess(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void {
    playlist.partInf = {
      partTarget: Number(tagAttributes[ExtXPartInf.PART_TARGET]),
    };
  }
}

export class ExtXServerControl extends TagWithAttributesProcessor {
  static HOLD_BACK = 'HOLD-BACK';
  static CAN_SKIP_UNTIL = 'CAN-SKIP-UNTIL';
  static PART_HOLD_BACK = 'PART-HOLD-BACK';
  static CAN_BLOCK_RELOAD = 'CAN-BLOCK-RELOAD';
  static CAN_SKIP_DATERANGES = 'CAN-SKIP-DATERANGES';

  requiredAttributes = new Set<string>();
  tag = EXT_X_SERVER_CONTROL;

  safeProcess(tagAttributes: Record<string, string>, playlist: ParsedPlaylist): void {
    let holdBack;

    if (tagAttributes[ExtXServerControl.HOLD_BACK]) {
      holdBack = Number(tagAttributes[ExtXServerControl.HOLD_BACK]);
    } else if (playlist.targetDuration) {
      holdBack = playlist.targetDuration * 3;
    }

    playlist.serverControl = {
      canSkipUntil: Number(tagAttributes[ExtXServerControl.CAN_SKIP_UNTIL]),
      partHoldBack: Number(tagAttributes[ExtXServerControl.PART_HOLD_BACK]),
      canBlockReload: parseBoolean(tagAttributes[ExtXServerControl.CAN_BLOCK_RELOAD], false),
      canSkipDateRanges: parseBoolean(tagAttributes[ExtXServerControl.CAN_SKIP_DATERANGES], false),
      holdBack,
    };
  }
}
