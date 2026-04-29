
// Mocking the behavior of replaceTags to verify it
function replaceTags(value, replacements) {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    let content = value;
    Object.entries(replacements).forEach(([k, v]) => {
      const regex = new RegExp(`\\{\\{${k}\\}\\}`, 'g');
      content = content.replace(regex, v || "");
    });
    return content;
  }

  if (typeof value === 'object' && 'richText' in value && Array.isArray(value.richText)) {
    const newRichText = value.richText.map((rt) => {
      let content = rt.text || "";
      Object.entries(replacements).forEach(([k, v]) => {
        const regex = new RegExp(`\\{\\{${k}\\}\\}`, 'g');
        content = content.replace(regex, v || "");
      });
      return { ...rt, text: content };
    });
    return { richText: newRichText };
  }

  return value;
}

const testReplacements = {
  year: "115",
  month: "04",
  repeat_n: ""
};

// Test String
console.log("Test String:");
console.log(replaceTags("{{year}} 年 {{month}} 月", testReplacements));

// Test Rich Text
console.log("\nTest Rich Text:");
const richTextValue = {
  richText: [
    { text: "{{year}}", font: { bold: true } },
    { text: " 年 " },
    { text: "{{month}}", font: { italic: true } },
    { text: " 月" }
  ]
};
console.log(JSON.stringify(replaceTags(richTextValue, testReplacements), null, 2));

// Test repeat_n
console.log("\nTest repeat_n:");
console.log(replaceTags("Checkbox {{repeat_n}}", testReplacements));
