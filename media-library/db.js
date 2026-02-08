/**
 * AI Media Library - IndexedDB Database Layer
 * メディア、カテゴリ、コレクション、タグの永続化ストレージ
 */

const DB_NAME = 'AIMediaLibrary';
const DB_VERSION = 1;

const STORES = {
  MEDIA: 'media',
  CATEGORIES: 'categories',
  COLLECTIONS: 'collections',
  PROMPT_TEMPLATES: 'promptTemplates',
};

class MediaDB {
  constructor() {
    this.db = null;
  }

  async open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Media store
        if (!db.objectStoreNames.contains(STORES.MEDIA)) {
          const mediaStore = db.createObjectStore(STORES.MEDIA, { keyPath: 'id' });
          mediaStore.createIndex('type', 'type', { unique: false });
          mediaStore.createIndex('categoryId', 'categoryId', { unique: false });
          mediaStore.createIndex('aiTool', 'aiTool', { unique: false });
          mediaStore.createIndex('rating', 'rating', { unique: false });
          mediaStore.createIndex('isFavorite', 'isFavorite', { unique: false });
          mediaStore.createIndex('createdAt', 'createdAt', { unique: false });
          mediaStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          mediaStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        }

        // Categories store
        if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
          const catStore = db.createObjectStore(STORES.CATEGORIES, { keyPath: 'id' });
          catStore.createIndex('parentId', 'parentId', { unique: false });
          catStore.createIndex('order', 'order', { unique: false });
        }

        // Collections store
        if (!db.objectStoreNames.contains(STORES.COLLECTIONS)) {
          const colStore = db.createObjectStore(STORES.COLLECTIONS, { keyPath: 'id' });
          colStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Prompt Templates store
        if (!db.objectStoreNames.contains(STORES.PROMPT_TEMPLATES)) {
          const ptStore = db.createObjectStore(STORES.PROMPT_TEMPLATES, { keyPath: 'id' });
          ptStore.createIndex('category', 'category', { unique: false });
          ptStore.createIndex('aiTool', 'aiTool', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  // ── Generic CRUD ──────────────────────────────────────────

  async _put(storeName, data) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(data);
      request.onsuccess = () => resolve(data);
      request.onerror = () => reject(request.error);
    });
  }

  async _get(storeName, id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async _getAll(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async _delete(storeName, id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async _getByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async _count(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async _clear(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ── Media Operations ──────────────────────────────────────

  generateId() {
    return crypto.randomUUID ? crypto.randomUUID() :
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
  }

  createMediaEntry(data) {
    const now = new Date().toISOString();
    return {
      id: this.generateId(),
      title: '',
      description: '',
      type: 'image', // 'image' | 'video'

      // AI Generation
      aiTool: '',
      model: '',
      promptPositive: '',
      promptNegative: '',
      parameters: {
        seed: null,
        steps: null,
        cfgScale: null,
        sampler: '',
        scheduler: '',
        denoise: null,
        resolution: '',
        aspectRatio: '',
        fps: null,
        duration: null,
        custom: {},
      },

      // Composition (カット割)
      composition: {
        shotType: '',
        cameraAngle: '',
        cameraMovement: '',
        lighting: '',
        colorPalette: [],
        mood: '',
        sceneDescription: '',
      },

      // Organization
      categoryId: '',
      tags: [],
      collectionIds: [],
      rating: 0,
      isFavorite: false,

      // File
      thumbnailDataUrl: '',
      fileUrl: '',
      fileName: '',
      fileSize: 0,

      // Notes
      notes: '',
      learnings: '',
      referenceUrls: [],

      // Timestamps
      createdAt: now,
      updatedAt: now,

      ...data,
    };
  }

  async saveMedia(data) {
    data.updatedAt = new Date().toISOString();
    if (!data.id) {
      data = this.createMediaEntry(data);
    }
    return this._put(STORES.MEDIA, data);
  }

  async getMedia(id) {
    return this._get(STORES.MEDIA, id);
  }

  async getAllMedia() {
    return this._getAll(STORES.MEDIA);
  }

  async deleteMedia(id) {
    return this._delete(STORES.MEDIA, id);
  }

  async getMediaByCategory(categoryId) {
    return this._getByIndex(STORES.MEDIA, 'categoryId', categoryId);
  }

  async getMediaByType(type) {
    return this._getByIndex(STORES.MEDIA, 'type', type);
  }

  async getMediaByTag(tag) {
    return this._getByIndex(STORES.MEDIA, 'tags', tag);
  }

  async getMediaByTool(aiTool) {
    return this._getByIndex(STORES.MEDIA, 'aiTool', aiTool);
  }

  async getFavorites() {
    return this._getByIndex(STORES.MEDIA, 'isFavorite', true);
  }

  async getMediaCount() {
    return this._count(STORES.MEDIA);
  }

  async searchMedia(query) {
    const all = await this.getAllMedia();
    const q = query.toLowerCase();
    return all.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.promptPositive.toLowerCase().includes(q) ||
      m.promptNegative.toLowerCase().includes(q) ||
      m.notes.toLowerCase().includes(q) ||
      m.learnings.toLowerCase().includes(q) ||
      m.tags.some(t => t.toLowerCase().includes(q)) ||
      m.aiTool.toLowerCase().includes(q) ||
      m.model.toLowerCase().includes(q) ||
      (m.composition.sceneDescription || '').toLowerCase().includes(q) ||
      (m.composition.mood || '').toLowerCase().includes(q)
    );
  }

  async filterMedia(filters) {
    let results = await this.getAllMedia();

    if (filters.type) {
      results = results.filter(m => m.type === filters.type);
    }
    if (filters.categoryId) {
      results = results.filter(m => m.categoryId === filters.categoryId);
    }
    if (filters.aiTool) {
      results = results.filter(m => m.aiTool === filters.aiTool);
    }
    if (filters.rating) {
      results = results.filter(m => m.rating >= filters.rating);
    }
    if (filters.isFavorite !== undefined) {
      results = results.filter(m => m.isFavorite === filters.isFavorite);
    }
    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(m =>
        filters.tags.some(t => m.tags.includes(t))
      );
    }
    if (filters.shotType) {
      results = results.filter(m => m.composition.shotType === filters.shotType);
    }
    if (filters.cameraAngle) {
      results = results.filter(m => m.composition.cameraAngle === filters.cameraAngle);
    }
    if (filters.query) {
      const q = filters.query.toLowerCase();
      results = results.filter(m =>
        m.title.toLowerCase().includes(q) ||
        m.promptPositive.toLowerCase().includes(q) ||
        m.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    // Sorting
    const sortBy = filters.sortBy || 'updatedAt';
    const sortDir = filters.sortDir || 'desc';
    results.sort((a, b) => {
      let va = a[sortBy], vb = b[sortBy];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return results;
  }

  // ── Category Operations ───────────────────────────────────

  createCategory(data) {
    return {
      id: this.generateId(),
      name: '',
      parentId: null,
      color: '#6366f1',
      icon: '📁',
      description: '',
      order: 0,
      ...data,
    };
  }

  async saveCategory(data) {
    if (!data.id) {
      data = this.createCategory(data);
    }
    return this._put(STORES.CATEGORIES, data);
  }

  async getCategory(id) {
    return this._get(STORES.CATEGORIES, id);
  }

  async getAllCategories() {
    const cats = await this._getAll(STORES.CATEGORIES);
    return cats.sort((a, b) => a.order - b.order);
  }

  async deleteCategory(id) {
    return this._delete(STORES.CATEGORIES, id);
  }

  async getCategoryTree() {
    const cats = await this.getAllCategories();
    const map = new Map();
    const roots = [];

    cats.forEach(c => map.set(c.id, { ...c, children: [] }));
    cats.forEach(c => {
      const node = map.get(c.id);
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId).children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  // ── Collection Operations ─────────────────────────────────

  createCollection(data) {
    const now = new Date().toISOString();
    return {
      id: this.generateId(),
      name: '',
      description: '',
      coverMediaId: null,
      mediaIds: [],
      createdAt: now,
      updatedAt: now,
      ...data,
    };
  }

  async saveCollection(data) {
    data.updatedAt = new Date().toISOString();
    if (!data.id) {
      data = this.createCollection(data);
    }
    return this._put(STORES.COLLECTIONS, data);
  }

  async getCollection(id) {
    return this._get(STORES.COLLECTIONS, id);
  }

  async getAllCollections() {
    return this._getAll(STORES.COLLECTIONS);
  }

  async deleteCollection(id) {
    return this._delete(STORES.COLLECTIONS, id);
  }

  async getCollectionMedia(collectionId) {
    const col = await this.getCollection(collectionId);
    if (!col) return [];
    const mediaItems = [];
    for (const mid of col.mediaIds) {
      const m = await this.getMedia(mid);
      if (m) mediaItems.push(m);
    }
    return mediaItems;
  }

  // ── Prompt Template Operations ────────────────────────────

  createPromptTemplate(data) {
    const now = new Date().toISOString();
    return {
      id: this.generateId(),
      name: '',
      category: '',
      aiTool: '',
      promptPositive: '',
      promptNegative: '',
      parameters: {},
      notes: '',
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
      ...data,
    };
  }

  async savePromptTemplate(data) {
    data.updatedAt = new Date().toISOString();
    if (!data.id) {
      data = this.createPromptTemplate(data);
    }
    return this._put(STORES.PROMPT_TEMPLATES, data);
  }

  async getPromptTemplate(id) {
    return this._get(STORES.PROMPT_TEMPLATES, id);
  }

  async getAllPromptTemplates() {
    return this._getAll(STORES.PROMPT_TEMPLATES);
  }

  async deletePromptTemplate(id) {
    return this._delete(STORES.PROMPT_TEMPLATES, id);
  }

  // ── Statistics ────────────────────────────────────────────

  async getStats() {
    const media = await this.getAllMedia();
    const categories = await this.getAllCategories();
    const collections = await this.getAllCollections();
    const templates = await this.getAllPromptTemplates();

    const images = media.filter(m => m.type === 'image');
    const videos = media.filter(m => m.type === 'video');
    const favorites = media.filter(m => m.isFavorite);

    // Tag frequency
    const tagMap = {};
    media.forEach(m => {
      m.tags.forEach(t => {
        tagMap[t] = (tagMap[t] || 0) + 1;
      });
    });
    const topTags = Object.entries(tagMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => ({ name, count }));

    // Tool usage
    const toolMap = {};
    media.forEach(m => {
      if (m.aiTool) {
        toolMap[m.aiTool] = (toolMap[m.aiTool] || 0) + 1;
      }
    });
    const toolUsage = Object.entries(toolMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    // Rating distribution
    const ratingDist = [0, 0, 0, 0, 0];
    media.forEach(m => {
      if (m.rating >= 1 && m.rating <= 5) {
        ratingDist[m.rating - 1]++;
      }
    });

    return {
      totalMedia: media.length,
      totalImages: images.length,
      totalVideos: videos.length,
      totalFavorites: favorites.length,
      totalCategories: categories.length,
      totalCollections: collections.length,
      totalTemplates: templates.length,
      topTags,
      toolUsage,
      ratingDistribution: ratingDist,
    };
  }

  // ── Export / Import ───────────────────────────────────────

  async exportAll() {
    const media = await this.getAllMedia();
    const categories = await this.getAllCategories();
    const collections = await this.getAllCollections();
    const templates = await this.getAllPromptTemplates();

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: { media, categories, collections, promptTemplates: templates },
    };
  }

  async importAll(json, mode = 'merge') {
    if (json.version !== 1) {
      throw new Error('Unsupported export version');
    }

    const { media, categories, collections, promptTemplates } = json.data;

    if (mode === 'replace') {
      await this._clear(STORES.MEDIA);
      await this._clear(STORES.CATEGORIES);
      await this._clear(STORES.COLLECTIONS);
      await this._clear(STORES.PROMPT_TEMPLATES);
    }

    let imported = { media: 0, categories: 0, collections: 0, promptTemplates: 0 };

    for (const item of (categories || [])) {
      await this._put(STORES.CATEGORIES, item);
      imported.categories++;
    }
    for (const item of (media || [])) {
      await this._put(STORES.MEDIA, item);
      imported.media++;
    }
    for (const item of (collections || [])) {
      await this._put(STORES.COLLECTIONS, item);
      imported.collections++;
    }
    for (const item of (promptTemplates || [])) {
      await this._put(STORES.PROMPT_TEMPLATES, item);
      imported.promptTemplates++;
    }

    return imported;
  }

  // ── Seed Default Categories ───────────────────────────────

  async seedDefaultCategories() {
    const count = await this._count(STORES.CATEGORIES);
    if (count > 0) return;

    const defaults = [
      { name: '人物・キャラクター', icon: '👤', color: '#ef4444', order: 1 },
      { name: '風景・背景', icon: '🏔️', color: '#22c55e', order: 2 },
      { name: 'コンセプトアート', icon: '🎨', color: '#8b5cf6', order: 3 },
      { name: 'プロダクト・商品', icon: '📦', color: '#f59e0b', order: 4 },
      { name: 'UI/UXデザイン', icon: '💻', color: '#06b6d4', order: 5 },
      { name: 'ロゴ・アイコン', icon: '✏️', color: '#ec4899', order: 6 },
      { name: 'テクスチャ・パターン', icon: '🔲', color: '#84cc16', order: 7 },
      { name: '動画・アニメーション', icon: '🎬', color: '#f97316', order: 8 },
      { name: 'ミュージックビデオ', icon: '🎵', color: '#a855f7', order: 9 },
      { name: 'CM・広告', icon: '📺', color: '#14b8a6', order: 10 },
      { name: '実験・テスト', icon: '🧪', color: '#6b7280', order: 11 },
    ];

    for (const cat of defaults) {
      await this.saveCategory(this.createCategory(cat));
    }
  }
}

// Singleton export
const mediaDB = new MediaDB();
