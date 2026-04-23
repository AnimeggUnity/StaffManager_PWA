import mammoth from 'mammoth';
import type { StaffData } from '../../types';

// 中文月份對應
const CHINESE_MONTHS: Record<string, number> = {
  '元': 1, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6,
  '七': 7, '八': 8, '九': 9, '十': 10, '十一': 11, '十二': 12,
};

// 中文日期對應
const CHINESE_DAYS: Record<string, number> = {
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
  '十': 10, '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15,
  '十六': 16, '十七': 17, '十八': 18, '十九': 19, '二十': 20,
  '二十一': 21, '二十二': 22, '二十三': 23, '二十四': 24, '二十五': 25,
  '二十六': 26, '二十七': 27, '二十八': 28, '二十九': 29, '三十': 30, '三十一': 31,
};

// 正則表達式
const DATE_PATTERN = /([元一二三四五六七八九十0-9]{1,3})\s*[月/]\s*([元一二三四五六七八九十0-9]{1,3})\s*日?/;
const LOCATION_CODES = ["Ａ", "Ｂ", "Ｃ", "Ｄ", "Ｅ", "Ｆ", "Ｇ", "Ｈ", "Ｉ", "Ｊ", "Ｋ", "Ｌ", "Ｍ", "Ｎ", "Ｏ"];

export async function parseOvertimeWord(
  buffer: ArrayBuffer, 
  staffData: StaffData,
  defaultDate?: string 
): Promise<{ data: StaffData; warnings: string[]; month: string | null }> {
  
  // 0. 初始化
  Object.keys(staffData.people).forEach(id => {
    staffData.people[id].records = [];
  });

  const options: any = { arrayBuffer: buffer };
  if (typeof (globalThis as any).Buffer !== 'undefined') {
    options.buffer = (globalThis as any).Buffer.from(buffer);
  }
  const result = await mammoth.extractRawText(options);
  const lines = result.value.split('\n').map(l => l.trim().replace(/\u3000/g, ''));
  
  const warnings: string[] = [];
  let currentDate: string | null = defaultDate || null;
  let detectedMonth: string | null = null;

  // 1. 建立姓名索引 (比照 Python DataStore._build_indexes)
  const nameIndex: Record<string, string[]> = {};
  Object.values(staffData.people).forEach(person => {
    const name = person.header.name;
    if (name.length >= 2) {
      const lastTwo = name.slice(-2);
      if (!nameIndex[lastTwo]) nameIndex[lastTwo] = [];
      if (!nameIndex[lastTwo].includes(name)) nameIndex[lastTwo].push(name);
    }
  });

  // 2. 衝突偵測結構 (比照 Python daily_seen)
  const dailySeen: Record<string, Record<string, string[]>> = {};

  lines.forEach(line => {
    if (!line) return;

    // A. 日期解析
    const lineNoSpace = line.replace(/\s+/g, '');
    const dateMatch = lineNoSpace.match(DATE_PATTERN);
    
    if (dateMatch) {
      const monthStr = dateMatch[1];
      const dayStr = dateMatch[2];
      const month = CHINESE_MONTHS[monthStr] || parseInt(monthStr);
      const day = CHINESE_DAYS[dayStr] || parseInt(dayStr);
      if (!isNaN(month) && !isNaN(day)) {
        currentDate = `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`;
        if (!detectedMonth) detectedMonth = month.toString();
      }
      return;
    }

    // B. 略過請假人員
    if (line.includes('請') && line.includes('假')) return;

    // C. 提取地點與事由
    let targetReason = "一般收運";
    if (line.includes('場內')) {
      targetReason = "場內支援";
    } else {
      const codeMatch = LOCATION_CODES.find(code => line.includes(code));
      if (codeMatch) {
        targetReason = `社區${codeMatch}點`;
      } else if (line.includes('支援外班')) {
        targetReason = "支援外班";
      } else {
        const riMatch = line.match(/([^\s、，。（）()+]+里)/);
        const bracketMatch = line.match(/\(([^)]+)\)/);
        if (riMatch) {
          targetReason = riMatch[1];
        } else if (bracketMatch) {
          targetReason = bracketMatch[1].split('＝')[0].split('、')[0];
        }
      }
    }

    // D. 匹配姓名並處理加班邏輯 (比照 Python _match_names)
    const matchedFullNames: string[] = [];
    Object.keys(nameIndex).forEach(shortName => {
      if (line.includes(shortName)) {
        const fullNames = nameIndex[shortName];
        if (fullNames.length > 1) {
          const skipMsg = `⚠️ 警告：偵測到撞名「${shortName}」可能為 ${fullNames.join('、')}，已跳過此行匹配`;
          if (!warnings.includes(skipMsg)) warnings.push(skipMsg);
        } else {
          matchedFullNames.push(fullNames[0]);
        }
      }
    });

    // 去重
    const uniqueNames = Array.from(new Set(matchedFullNames));

    uniqueNames.forEach(name => {
      // 搵工號
      const empId = Object.keys(staffData.people).find(id => staffData.people[id].header.name === name);
      if (!empId || !currentDate) return;

      const person = staffData.people[empId];
      const isEarly = person.header.shift === "早班";
      const isLate = person.header.shift === "晚班";
      const isLocationA = targetReason === "社區Ａ點";

      let sh = "08", eh = "12";
      const sm = "00", em = "00";

      if (isEarly && isLocationA) {
        sh = "06"; eh = "08";
      } else if (isLate) {
        sh = "08"; eh = "12";
      } else if (isEarly && !isLocationA) {
        // 早班非A點排除
        const skipMsg = `[排除] 早班人員 ${name} 於「${targetReason}」不計加班`;
        if (!warnings.includes(skipMsg)) warnings.push(skipMsg);
        return;
      } else {
        // 非名單人員警告
        const skipMsg = `[排除] 人員 ${name} 不在早晚班名單中，跳過其於「${targetReason}」之記錄`;
        if (!warnings.includes(skipMsg)) warnings.push(skipMsg);
        return;
      }

      // 避免重複加入
      const isDuplicate = person.records.some(r => r.date === currentDate && r.reason === targetReason);
      if (!isDuplicate) {
        // 重複排班檢查 (比照 Python daily_seen)
        if (!dailySeen[currentDate]) dailySeen[currentDate] = {};
        if (!dailySeen[currentDate][name]) dailySeen[currentDate][name] = [];
        
        if (dailySeen[currentDate][name].length > 0) {
          const conflictReason = dailySeen[currentDate][name][0];
          warnings.push(`⚠️ 警告：${name} 於 ${currentDate} 重複排班：${conflictReason} 與 ${targetReason}`);
        }
        dailySeen[currentDate][name].push(targetReason);

        person.records.push({ date: currentDate, reason: targetReason, sh, sm, eh, em });
      }
    });
  });

  return { data: staffData, warnings, month: detectedMonth };
}
