import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseOvertimeWord } from '../overtimeParser';
import mammoth from 'mammoth';
import type { StaffData } from '../../../types';

// 模擬 mammoth
vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn(),
  },
}));

describe('overtimeParser 邏輯測試', () => {
  let mockStaffData: StaffData;

  beforeEach(() => {
    // 每次測試前重置資料
    mockStaffData = {
      month: '1',
      people: {
        '001': {
          header: { name: '陳大明', emp_id: '001', shift: '早班', month: '1' },
          records: [],
        },
        '002': {
          header: { name: '李小華', emp_id: '002', shift: '晚班', month: '1' },
          records: [],
        },
      },
    };
    vi.clearAllMocks();
  });

  it('應該能正確解析中文日期格式並匹配人員', async () => {
    // 模擬 Word 內容
    const mockText = `
      一月一日
      陳大明 社區Ａ點
      李小華 一般收運
    `;
    (mammoth.extractRawText as any).mockResolvedValue({ value: mockText });

    const result = await parseOvertimeWord(new ArrayBuffer(0), mockStaffData);

    // 檢查日期
    expect(result.month).toBe('1');
    
    // 檢查陳大明 (早班 + 社區A點 = 06:00-08:00)
    const daming = result.data.people['001'];
    expect(daming.records[0]).toMatchObject({
      date: '01/01',
      reason: '社區Ａ點',
      sh: '06', eh: '08'
    });

    // 檢查李小華 (晚班 = 08:00-12:00)
    const xiaohua = result.data.people['002'];
    expect(xiaohua.records[0]).toMatchObject({
      date: '01/01',
      reason: '一般收運',
      sh: '08', eh: '12'
    });
  });

  it('當早班人員在非A點工作時，應發出警告且不計加班', async () => {
    const mockText = `
      02/14
      陳大明 一般收運
    `;
    (mammoth.extractRawText as any).mockResolvedValue({ value: mockText });

    const result = await parseOvertimeWord(new ArrayBuffer(0), mockStaffData);

    const daming = result.data.people['001'];
    expect(daming.records.length).toBe(0); // 不應有記錄
    expect(result.warnings.some(w => w.text.includes('早班 陳大明 於「一般收運」不計加班'))).toBe(true);
  });

  it('應該能偵測重複排班並發出錯誤訊息', async () => {
    const mockText = `
      三月五日
      李小華 社區Ａ點
      李小華 場內支援
    `;
    (mammoth.extractRawText as any).mockResolvedValue({ value: mockText });

    const result = await parseOvertimeWord(new ArrayBuffer(0), mockStaffData);

    expect(result.warnings.some(w => w.level === 'error' && w.text.includes('重複排班'))).toBe(true);
    // 雖然重複，但目前邏輯仍會加入記錄 (比照 Python 邏輯)
    expect(result.data.people['002'].records.length).toBe(2);
  });

  it('應該能處理全形空格與雜訊', async () => {
    const mockText = `
      四月十日
      　陳大明　社區Ａ點　
    `;
    (mammoth.extractRawText as any).mockResolvedValue({ value: mockText });

    const result = await parseOvertimeWord(new ArrayBuffer(0), mockStaffData);

    expect(result.data.people['001'].records[0].date).toBe('04/10');
  });
});
