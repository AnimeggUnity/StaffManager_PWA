import { describe, it, expect } from 'vitest';

describe('基礎環境測試', () => {
  it('應該能夠執行簡單的加法測試', () => {
    expect(1 + 1).toBe(2);
  });

  it('應該能夠讀取專案環境', () => {
    const testVar = true;
    expect(testVar).toBe(true);
  });
});
