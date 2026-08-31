export const KEYWORD_COLORS: Record<string, "blue" | "purple" | "red" | "green"> = {
  จุติ: "blue",
  คำสั่งเสีย: "blue",
  เซ่นไหว้: "blue",
  พอดี: "blue",
  สอดแนม: "purple",
  ธรณีสูบ: "purple",
  เลือกปฏิบัติ: "purple",
  เนรเทศ: "purple",
  สามัคคี: "red",
  โล่มนุษย์: "red",
  เตะไข่: "red",
  ลูกฮึด: "red",
  แทงหลัง: "red",
  เทิร์นละครั้ง: "green",
  ต่อเนื่อง: "green",
  สั่งใช้: "green",
  อัตโนมัติ: "green",
};

export const KEYWORD_FILES: Record<string, string> = {
  จุติ: "rebirth",
  คำสั่งเสีย: "lastwill",
  เซ่นไหว้: "worship",
  สอดแนม: "spy",
  ธรณีสูบ: "earthquake",
  เลือกปฏิบัติ: "discrimination",
  สามัคคี: "unity",
  โล่มนุษย์: "humanshield",
  เตะไข่: "kick",
  เทิร์นละครั้ง: "onceperturn",
  ต่อเนื่อง: "continuous",
  สั่งใช้: "command",
  อัตโนมัติ: "auto",
  พอดี: "exact",
  ลูกฮึด: "guts",
  แทงหลัง: "backstab",
  เนรเทศ: "exile",
  คู่หู: "link",
};

export const KEYWORDS = Object.keys(KEYWORD_COLORS);

export function keywordImageUrl(keyword: string) {
  const file = KEYWORD_FILES[keyword];
  if (!file) return null;
  return `https://cdn.bottcg.com/assets/bottcg/keywords/${file}.png`;
}
