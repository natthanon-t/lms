export const buildRandomCoverUrl = (seed) =>
  `https://picsum.photos/seed/${encodeURIComponent(String(seed))}/640/360`;

export const ensureCoverImage = (value, fallbackSeed) => {
  const normalizedValue = String(value ?? "").trim();
  if (normalizedValue) {
    return normalizedValue;
  }
  return buildRandomCoverUrl(fallbackSeed);
};

export const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์รูปได้"));
    reader.readAsDataURL(file);
  });

