import type { TagInfo } from './state-machine';
import type { TagProcessor } from './tags/base';
// import type { ParsedManifest } from '@/dash-parser/types/parsedManifest';
// import type { SharedState } from '@/dash-parser/types/sharedState';

export class PendingProcessors {
  private readonly pendingMap_ = new Map<TagInfo, PendingProcess>();

  public getPendingProcessFor(tagInfo: TagInfo): PendingProcess | null {
    const pendingProcess = this.pendingMap_.get(tagInfo);

    return pendingProcess ?? null;
  }

  public setPendingProcessFor(tagInfo: TagInfo, pendingProcess: PendingProcess): void {
    this.pendingMap_.set(tagInfo, pendingProcess);
  }

  public removePendingProcessFor(tagInfo: TagInfo): void {
    this.pendingMap_.delete(tagInfo);
  }
}

export class PendingProcess {
  private readonly waitingForMap_ = new Map<string, TagInfo | null>();
  private readonly tagProcessor_: TagProcessor;
  private readonly tagInfo_: TagInfo;
  private readonly parentTagInfo_: TagInfo | null;

  public constructor(
    tagProcessor: TagProcessor,
    tagInfo: TagInfo,
    parentTagInfo: TagInfo | null,
    waitingForSet: Set<string>
  ) {
    this.tagProcessor_ = tagProcessor;
    this.tagInfo_ = tagInfo;
    this.parentTagInfo_ = parentTagInfo;
    waitingForSet.forEach((tagKey) => {
      this.waitingForMap_.set(tagKey, null);
    });
  }

  public isRequiredChild(tagInfo: TagInfo): boolean {
    return this.waitingForMap_.has(tagInfo.tagKey);
  }

  public updateChildAvailability(tagInfo: TagInfo): void {
    this.waitingForMap_.set(tagInfo.tagKey, tagInfo);
  }

  public getIsAllRequiredDataAvailable(): boolean {
    for (const val of this.waitingForMap_.values()) {
      if (val === null) {
        return false;
      }
    }

    return true;
  }

  // public process(parsedManifest: ParsedManifest, sharedState: SharedState): void {
  public process(): void {
    // this.tagProcessor.processPending(this.tagInfo, this.parentTagInfo, this.waitingForMap, parsedManifest, sharedState);
    return this.tagProcessor_.processPending();
  }
}
