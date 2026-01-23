import { App, type CachedMetadata, type FrontMatterCache, getAllTags, parseFrontMatterTags, TFile } from 'obsidian';
import { type IFile } from '../types/interfaces';

export type OptionalTasksFile = TasksFile | undefined;

export class TasksFile implements IFile<TFile> {
  name: string;
  _path: string;
  _cachedMetadata: CachedMetadata;
  // Always make TasksFile.frontmatter.tags exist and be empty, even if no frontmatter present:
  _frontmatter: FrontMatterCache = { tags: [] };
  _tags: string[] = [];

  constructor(private app: App, public file: TFile, cachedMetadata: CachedMetadata = {}) {
    this.app = app;
    this.name = file.name;
    this._path = file.path;
    this._cachedMetadata = cachedMetadata;

    const rawFrontmatter = cachedMetadata.frontmatter;
    if (rawFrontmatter !== undefined) {
      this._frontmatter = JSON.parse(JSON.stringify(rawFrontmatter)) as FrontMatterCache;
      this._frontmatter.tags = parseFrontMatterTags(rawFrontmatter) ?? [];
    }

    if (Object.keys(cachedMetadata).length !== 0) {
      const tags = getAllTags(this.cachedMetadata) ?? [];
      this._tags = [...new Set(tags)];
    }
  }

  get path(): string {
    return this._path;
  }

  get tags(): string[] {
    return this._tags;
  }

  /**
 * Return the root to the file.
 */
  get root(): string {
    let path = this.path.replace(/\\/g, '/');

    if (path.charAt(0) === '/') {
      path = path.substring(1);
    }

    const separatorIndex = path.indexOf('/');
    if (separatorIndex == -1) {
      return '/';
    }
    return path.substring(0, separatorIndex + 1);
  }

  get folder(): string {
    const path = this.path;
    const fileNameWithExtension = this.filename;
    const folder = path.substring(0, path.lastIndexOf(fileNameWithExtension));
    if (folder === '') {
      return '/';
    }
    return folder;
  }

  /**
   * Return the filename including the extension.
   */
  get filename(): string {
    // Copied from Task.filename and FilenameField.value() initially
    const fileNameMatch = this.path.match(/([^/]+)$/);
    if (fileNameMatch !== null) {
      return fileNameMatch[1];
    } 
    return '';
  }

  get filenameWithoutExtension(): string {
    return this.filename.replace(/\.md$/, '');
  }

  /**
 * Return the path to the file, with the filename extension removed.
 */
  get pathWithoutExtension(): string {
    return this.path.replace(/\.md$/, '');
  }

  async renameAsync(newPath: string): Promise<void> {
    await this.createHierachy(newPath);
    await this.app.fileManager.renameFile(this.file, newPath);
  }

  isInFolder(folder: string): boolean {
    return this.file.path.toLowerCase().startsWith(folder.toLowerCase());
  }
  async getContentAsync(): Promise<string> {
    return await this.app.vault.cachedRead(this.file);
  }
  async setContentAsync(val: string): Promise<void> {
    // TODO: replace with process or editor (if the file is open) at some point
    await this.app.vault.modify(this.file, val);
  }

  //async getLastModifiedAsync(): Promise<DateTime> {
    //const stat = await this.app.vault.adapter.stat(this.file.path);
    //return new DateTime(stat.mtime);
  //}

  /**
   * Return Obsidian's [CachedMetadata](https://docs.obsidian.md/Reference/TypeScript+API/CachedMetadata)
   * for this file, if available.
   *
   * Any raw frontmatter may be accessed via `cachedMetadata.frontmatter`.
   * See [FrontMatterCache](https://docs.obsidian.md/Reference/TypeScript+API/FrontMatterCache).
   * But prefer using {@link frontmatter} where possible.
   *
   * @note This is currently only populated for Task objects when read in the Obsidian plugin,
   *       and queries in the plugin.
   *       It's not populated in most unit tests.
   *       If not available, it returns an empty object, {}.
   *
   * @see frontmatter, which provides a cleaned-up version of the raw frontmatter.
   */
  public get cachedMetadata(): CachedMetadata {
    return this._cachedMetadata;
  }

  /**
   * Returns a cleaned-up version of the frontmatter.
   *
   * If accessing tags, please note:
   * - If there are any tags in the frontmatter, `frontmatter.tags` will have the values with '#' prefix added.
   * - It recognises both `frontmatter.tags` and `frontmatter.tag` (and various capitalisation combinations too).
   * - It removes any null tags.
   *
   * @note This is currently only populated for Task objects when read in the Obsidian plugin.
   *       It's not populated for queries in the plugin, nor in most unit tests.
   *       And it is an empty object, {}, if the {@link cachedMetadata} has not been populated
   *       or if the markdown file has no frontmatter or empty frontmatter.
   */
  public get frontmatter(): FrontMatterCache {
    return this._frontmatter;
  }

  /**
   * Does the data content of another TasksFile's raw frontmatter
   * match this one.
   *
   * This can be used to detect whether Task objects need to be updated,
   * or (later) whether queries need to be updated, due to user edits.
   *
   * @param other
   */
  public rawFrontmatterIdenticalTo(other: TasksFile): boolean {
    const thisFrontmatter: FrontMatterCache | undefined = this.cachedMetadata.frontmatter;
    const thatFrontmatter: FrontMatterCache | undefined = other.cachedMetadata.frontmatter;
    if (thisFrontmatter === thatFrontmatter) {
      // The same object or both undefined
      return true;
    }

    if (!thisFrontmatter || !thatFrontmatter) {
      return false; // One is undefined and the other is not
    }

    // Check if the same content.
    // This is fairly simplistic.
    // For example, it treats values that are the same but in a different order as being different,
    // although their information content is the same.
    return JSON.stringify(thisFrontmatter) === JSON.stringify(thatFrontmatter);
  }

  /**
   * This is documented for users and so must not be changed.
   * @param key
   */
  public hasProperty(key: string): boolean {
    const foundKey = this.findKeyInFrontmatter(key);
    if (foundKey === undefined) {
      return false;
    }

    const propertyValue = this.frontmatter[foundKey] as string | number | boolean | string[] | number[] | null | undefined;
    if (propertyValue === null) {
      return false;
    }

    if (propertyValue === undefined) {
      return false;
    }

    return true;
  }

  /**
   * This is documented for users and so must not be changed.
   * @param key
   */
  public property(key: string): string | number | boolean | string[] | number[] | null{
    const foundKey = this.findKeyInFrontmatter(key);
    if (foundKey === undefined) {
      return null;
    }

    const propertyValue = this.frontmatter[foundKey] as string | number | boolean | string[] | number[] | null | undefined;
    if (propertyValue === undefined) {
      return null;
    }

    if (Array.isArray(propertyValue)) {
      return propertyValue.filter((item: string | number | null) => item !== null) as string[] | number[];
    }

    return propertyValue;
  }

  private findKeyInFrontmatter(key: string) {
    const lowerCaseKey = key.toLowerCase();
    return Object.keys(this.frontmatter).find((searchKey: string) => {
      const lowerCaseSearchKey = searchKey.toLowerCase();
      return lowerCaseSearchKey === lowerCaseKey;
    });
  }

  /**
   * Compare all the fields in another TasksFile, to detect any differences from this one.
   *
   * If any field is different in any way, it will return false.
   *
   * @param other
   */
  public identicalTo(other: TasksFile) {
    if (this.path !== other.path) {
      return false;
    }
    return this.rawFrontmatterIdenticalTo(other);
  }

  private getParent(path: string): string {
    const lastSlash = path.lastIndexOf("/");
    return path.substring(0, lastSlash);
  }

  private async createHierachy(
    path: string,
    isParent = false
  ): Promise<void> {
    const parent = this.getParent(path);
    if (!(await this.app.vault.adapter.exists(parent, false))) {
      await this.createHierachy(parent, true);
    }
    if (isParent) {
      await this.app.vault.createFolder(path);
    }
  }


}