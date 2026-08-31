export const SERIES_NAMES: Record<string, string> = {
  SD01: "ตัวตึงไกรลาส",
  SD02: "วีรบุรุษปากซอย",
  SD03: "นรกก็แค่น้ำพริก",
  SD04: "ทหารไก่ชนเขา",
  SD05: "กำเนิดจากน้ำ",
  SD06: "๖ ประจัญบาน",
  SD07: "VS 18 หัวเมือง",
  SD08: "SD08",
  SD09: "SD09",
  BT01: "Welcome ตลิ่งชัน",
  BT02: "Attack on เพื่อนบ้าน",
  BT03: "BT03",
  BT04: "BT04",
  BT05: "Culture ช๊อค",
  BT06: "โลกา Armageddon",
  BT07: "Life of หน่วง",
  BT08: "เพราะ Warrior is นักรบ",
  BT09: "มิตรภาพและสายฟ้า",
  BT10: "BT10",
  BT11: "Journey to นคร Z",
  CC01: "CC01",
  CC02: "CC02",
  ODY1: "Odenya",
  PRE0: "Pre-release",
  PRMO: "Promo",
  SL01: "SL01",
  SL02: "SL02",
  KD00: "KD00",
  KD01: "KD01",
  KD02: "KD02",
  KD03: "KD03",
  KD04: "KD04",
  FPRO: "FPRO",
};

export function seriesCode(print: string) {
  return print.split("-")[0] ?? print;
}

export function seriesLabel(print: string) {
  const code = seriesCode(print);
  const name = SERIES_NAMES[code];
  if (!name || name === code) return code;
  return `${code} ${name}`;
}
