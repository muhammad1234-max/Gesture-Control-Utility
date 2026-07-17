export interface AppMetadata {
  name: string;
  supportedShortcuts: string[];
  description: string;
}

export class KnowledgeBase {
  private static instance: KnowledgeBase;
  private index: Map<string, AppMetadata> = new Map();

  private constructor() {
    // Initial indexing
    this.index.set('chrome.exe', {
      name: 'Google Chrome',
      supportedShortcuts: ['CTRL+T', 'CTRL+W', 'CTRL+SHIFT+T'],
      description: 'Web Browser'
    });
    this.index.set('code.exe', {
      name: 'Visual Studio Code',
      supportedShortcuts: ['CTRL+P', 'CTRL+SHIFT+P'],
      description: 'Code Editor'
    });
  }

  public static getInstance(): KnowledgeBase {
    if (!KnowledgeBase.instance) {
      KnowledgeBase.instance = new KnowledgeBase();
    }
    return KnowledgeBase.instance;
  }

  public getApplicationMetadata(appName: string): AppMetadata | null {
    return this.index.get(appName.toLowerCase()) || null;
  }

  public search(query: string): AppMetadata[] {
    console.log(`[KnowledgeBase] Searching local KB for: ${query}`);
    const results: AppMetadata[] = [];
    const q = query.toLowerCase();

    for (const [key, meta] of this.index.entries()) {
      if (meta.name.toLowerCase().includes(q) || meta.description.toLowerCase().includes(q)) {
        results.push(meta);
      }
    }
    return results;
  }
}
