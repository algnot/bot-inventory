const CDN = "https://cdn.bottcg.com/cards";
const SPECIAL_SET_FOLDERS: Record<string, string> = { SD09: "123v1k1" };
const RARE_SUFFIX = new Set(["SCR", "PR", "CBR"]);

export function getCardImageUrl(print: string, rare: string) {
  const set = print.split("-")[0] ?? "";
  const folder = SPECIAL_SET_FOLDERS[set];
  const root = folder ? `${CDN}/${folder}` : CDN;
  const filename = RARE_SUFFIX.has(rare) ? `${print}-${rare}` : print;
  return `${root}/${filename}.png`;
}

export function displayRare(rare: string) {
  return rare === "SCR" ? "SEC" : rare;
}

export const SYMBOL_FILES: Record<string, string> = {
  เทพ: "deity",
  ยักษ์: "giant",
  จอมเวทย์: "wizard",
  คน: "human",
  แมลง: "insect",
  สัตว์: "animal",
  รัททาทุย: "rattatuy",
  นรก: "hell",
  ผี: "ghost",
  ปลา: "fish",
  หุ่นยนต์: "robot",
  สิ่งก่อสร้าง: "construct",
  ต่างชาติ: "foreign",
  ต้นไม้: "tree",
  เปรต: "pret",
  ฤษี: "rishi",
  เอเลี่ยน: "alien",
  กะปอม: "kapom",
  สัตว์วิเศษ: "beast",
  ทหาร: "soldier",
  ไซเบอร์: "cyber",
  มังกร: "dragon",
};

export function symbolImageUrl(symbol: string) {
  const file = SYMBOL_FILES[symbol];
  if (!file) return null;
  return `https://cdn.bottcg.com/assets/bottcg/symbol/${file}.png`;
}
