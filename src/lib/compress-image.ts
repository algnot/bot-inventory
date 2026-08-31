const MAX_EDGE = 1600;
const MAX_DATA_URL = 900_000;

async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fall through — HEIC or odd types */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("เปิดรูปไม่สำเร็จ ลองเป็น JPG หรือ PNG"));
      img.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function compressImageFile(file: File) {
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("รูปใหญ่เกินไป");
  }
  const source = await decodeImage(file);
  const width = "width" in source ? source.width : 0;
  const height = "height" in source ? source.height : 0;
  if (!width || !height) throw new Error("เปิดรูปไม่สำเร็จ");

  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("ย่อรูปไม่สำเร็จ");
  ctx.drawImage(source, 0, 0, w, h);
  if ("close" in source) source.close();

  let quality = 0.84;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > MAX_DATA_URL && quality > 0.4) {
    quality -= 0.12;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  if (dataUrl.length > MAX_DATA_URL) {
    throw new Error("ย่อรูปแล้วยังใหญ่ไป ลองถ่ายใกล้ขึ้นหรือตัดให้เหลือการ์ด");
  }
  return dataUrl;
}
