import { MemoryStorage } from '../src/memory';

describe('MemoryStorage', () => {
  let storage: MemoryStorage<string>;

  beforeEach(() => {
    storage = new MemoryStorage<string>();
  });

  it('should create storage', () => {
    expect(storage).toBeDefined();
  });

  it('should set and get item', async () => {
    const item = await storage.set('key1', 'value1');
    expect(item.id).toBe('key1');
    expect(item.data).toBe('value1');

    const retrieved = await storage.get('key1');
    expect(retrieved).toBeDefined();
    expect(retrieved?.data).toBe('value1');
  });

  it('should return null for non-existent item', async () => {
    const result = await storage.get('non-existent');
    expect(result).toBeNull();
  });

  it('should delete item', async () => {
    await storage.set('key1', 'value1');
    const deleted = await storage.delete('key1');
    expect(deleted).toBe(true);

    const retrieved = await storage.get('key1');
    expect(retrieved).toBeNull();
  });

  it('should return false when deleting non-existent item', async () => {
    const deleted = await storage.delete('non-existent');
    expect(deleted).toBe(false);
  });

  it('should check if item exists', async () => {
    await storage.set('key1', 'value1');
    expect(await storage.exists('key1')).toBe(true);
    expect(await storage.exists('non-existent')).toBe(false);
  });

  it('should list items', async () => {
    await storage.set('key1', 'value1');
    await storage.set('key2', 'value2');
    await storage.set('key3', 'value3');

    const items = await storage.list();
    expect(items).toHaveLength(3);
  });

  it('should list items with limit', async () => {
    await storage.set('key1', 'value1');
    await storage.set('key2', 'value2');
    await storage.set('key3', 'value3');

    const items = await storage.list({ limit: 2 });
    expect(items).toHaveLength(2);
  });

  it('should list items with offset', async () => {
    await storage.set('key1', 'value1');
    await storage.set('key2', 'value2');
    await storage.set('key3', 'value3');

    const items = await storage.list({ offset: 1 });
    expect(items).toHaveLength(2);
  });

  it('should clear storage', async () => {
    await storage.set('key1', 'value1');
    await storage.set('key2', 'value2');
    await storage.clear();

    const items = await storage.list();
    expect(items).toHaveLength(0);
  });

  it('should update existing item', async () => {
    const item1 = await storage.set('key1', 'value1');
    const item2 = await storage.set('key1', 'value2');
    expect(item2.createdAt).toEqual(item1.createdAt);
    expect(item2.data).toBe('value2');
  });

  it('should store metadata', async () => {
    const item = await storage.set('key1', 'value1', { tag: 'test' });
    expect(item.metadata?.tag).toBe('test');
  });
});