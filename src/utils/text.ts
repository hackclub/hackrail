const breakList = ["$", "%", "+"];

export type TextBlock = {
  text: string;
  isInBreakList: boolean;
};

function separateText(text: string): TextBlock[] {
  const result: TextBlock[] = [];
  let currentText = "";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (breakList.includes(char)) {
      result.push({ text: currentText, isInBreakList: false });
      result.push({ text: char, isInBreakList: true });
      currentText = "";
    } else {
      currentText += char;
    }
  }

  if (currentText) {
    result.push({ text: currentText, isInBreakList: false });
  }

  return result;
}

export { separateText };
