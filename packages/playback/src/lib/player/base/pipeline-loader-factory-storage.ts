import type { IPipelineFactoryConfiguration, IPipelineLoaderFactory } from '../../types/pipeline.declarations';

const normalizeMimeType = (mimeType: string): string => mimeType.toLowerCase();

/**
 * Allows multiple pipeline loader factories for a specific mime type
 * Normally there should only one pipeline loader per mime type
 * but in some complex cases, it might be necessary to have multiple loaders
 * If that is the case, users should be able to select (via alias) specific pipeline loader when loading source.
 * If no alias is provided arbitrary pipeline loader will be selected.
 */
export class PipelineLoaderFactoryStorage {
  private readonly map_ = new Map<string, Map<string, IPipelineLoaderFactory>>();

  /**
   * Add pipeline loader factory config for a specific mime type
   * @param mimeType - mime type
   * @param configuration - pipeline loader factory config
   */
  public add(mimeType: string, configuration: IPipelineFactoryConfiguration): void {
    const normalizedMimeType = normalizeMimeType(mimeType);

    let internal = this.map_.get(normalizedMimeType);

    if (!internal) {
      internal = new Map();
      this.map_.set(normalizedMimeType, internal);
    }

    internal.set(configuration.alias, configuration.loader);
  }

  /**
   * Returns pipeline loader factory or null for a specific mime type
   * @param mimeType - mime type
   * @param alias - loader alias
   */
  public get(mimeType: string, alias: string): IPipelineLoaderFactory | null {
    return this.map_.get(normalizeMimeType(mimeType))?.get(alias) ?? null;
  }

  /**
   * Returns the first available pipeline loader factory or null for a specific mime type regardless of alias
   * @param mimeType - mime type
   */
  public getFirstAvailable(mimeType: string): IPipelineLoaderFactory | null {
    return this.map_.get(normalizeMimeType(mimeType))?.values().next().value ?? null;
  }

  /**
   * Remove pipeline loader factory for a specific mime type
   * @param mimeType - mime type
   * @param alias - loader alias
   */
  public remove(mimeType: string, alias: string): boolean {
    const internal = this.map_.get(normalizeMimeType(mimeType));

    if (!internal) {
      return false;
    }

    return internal.delete(alias);
  }

  /**
   * Check if player already has pipeline loader factory for a specific mime type
   * @param mimeType - mime type
   * @param alias - loader alis
   */
  public has(mimeType: string, alias: string): boolean {
    const internal = this.map_.get(normalizeMimeType(mimeType));

    if (!internal) {
      return false;
    }

    return internal.has(alias);
  }
}
