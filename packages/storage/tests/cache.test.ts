import { MemoryCache } from '../src/cache';

describe('MemoryCache', () => {
  let cache: MemoryCache<string>;

  beforeEach(() => {
    cache = new MemoryCache<string>();
  });

  it('should create cache', () => {
    expect(cache).toBeDefined();
  });

  it('should set and get value', async () => {
    await cache.set('key1', 'value1');
    const value = await cache.get('key1');
    expect(value).toBe('value1');
  });

  it('should return null for non-existent key', async () => {
    const value = await cache.get('non-existent');
    expect(value).toBeNull();
  });

  it('should delete value', async () => {
    await cache.set('key1', 'value1');
    const deleted = await cache.delete('key1');
    expect(deleted).toBe(true);

    const value = await cache.get('key1');
    expect(value).toBeNull();
  });

  it('should return false when deleting non-existent key', async () => {
    const deleted = await cache.delete('non-existent');
    expect(deleted).toBe(false);
  });

  it('should check if key exists', async () => {
    await cache.set('key1', 'value1');
    expect(await cache.has('key1')).toBe(true);
    expect(await cache.has('non-existent')).toBe(false);
  });

  it('should clear cache', async () => {
    await cache.set('key1', 'value1');
    await cache.set('key2', 'value2');
    await cache.clear();

    const keys = await cache.keys();
    expect(keys).toHaveLength(0);
  });

  it('should list all keys', async () => {
    await cache.set('key1', 'value1');
    await cache.set('key2', 'value2');
    await cache.set('key3', 'value3');

    const keys = await cache.keys();
    expect(keys).toHaveLength(3);
  });

  it('should list keys matching pattern', async () => {
    await cache.set('user:1', 'value1');
    await cache.set('user:2', 'value2');
    await cache.set('session:1', 'value3');

    const keys = await cache.keys('user:*');
    expect(keys).toHaveLength(2);
  });

  it('should expire entries with TTL', async () => {
    jest.useFakeTimers();
    
    await cache.set('key1', 'value1', 1); // 1 second TTL
    
    expect(await cache.get('key1')).toBe('value1');
    
    jest.advanceTimersByTime(2000); // 2 seconds
    
    const value = await cache.get('key1');
    expect(value).toBeNull();
    
    jest.useRealTimers();
  });

  it('should handle has for expired entries', async () => {
    jest.useFakeTimers();
    
    await cache.set('key1', 'value1', 1);
    expect(await cache.has('key1')).toBe(true);
    
    jest.advanceTimersByTime(2000);
    
    expect(await cache.has('key1')).toBe(false);
    
    jest.useRealTimers();
  });
});