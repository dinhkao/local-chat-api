// Vietnamese accent map: character → latin equivalent
const ACCENT_MAP = {
  a: "a", à: "a", ả: "a", ã: "a", á: "a", ạ: "a",
  ă: "a", ằ: "a", ẳ: "a", ẵ: "a", ắ: "a", ặ: "a",
  â: "a", ầ: "a", ẩ: "a", ẫ: "a", ấ: "a", ậ: "a",
  e: "e", è: "e", ẻ: "e", ẽ: "e", é: "e", ẹ: "e",
  ê: "e", ề: "e", ể: "e", ễ: "e", ế: "e", ệ: "e",
  i: "i", ì: "i", ỉ: "i", ĩ: "i", í: "i", ị: "i",
  o: "o", ò: "o", ỏ: "o", õ: "o", ó: "o", ọ: "o",
  ô: "o", ồ: "o", ổ: "o", ỗ: "o", ố: "o", ộ: "o",
  ơ: "o", ờ: "o", ở: "o", ỡ: "o", ớ: "o", ợ: "o",
  u: "u", ù: "u", ủ: "u", ũ: "u", ú: "u", ụ: "u",
  ư: "u", ừ: "u", ử: "u", ữ: "u", ứ: "u", ự: "u",
  y: "y", ỳ: "y", ỷ: "y", ỹ: "y", ý: "y", ỵ: "y",
  đ: "d",
  A: "A", À: "A", Ả: "A", Ã: "A", Á: "A", Ạ: "A",
  Ă: "A", Ằ: "A", Ẳ: "A", Ẵ: "A", Ắ: "A", Ặ: "A",
  Â: "A", Ầ: "A", Ẩ: "A", Ẫ: "A", Ấ: "A", Ậ: "A",
  E: "E", È: "E", Ẻ: "E", Ẽ: "E", É: "E", Ẹ: "E",
  Ê: "E", Ề: "E", Ể: "E", Ễ: "E", Ế: "E", Ệ: "E",
  I: "I", Ì: "I", Ỉ: "I", Ĩ: "I", Í: "I", Ị: "I",
  O: "O", Ò: "O", Ỏ: "O", Õ: "O", Ó: "O", Ọ: "O",
  Ô: "O", Ồ: "O", Ổ: "O", Ỗ: "O", Ố: "O", Ộ: "O",
  Ơ: "O", Ờ: "O", Ở: "O", Ỡ: "O", Ớ: "O", Ợ: "O",
  U: "U", Ù: "U", Ủ: "U", Ũ: "U", Ú: "U", Ụ: "U",
  Ư: "U", Ừ: "U", Ử: "U", Ữ: "U", Ứ: "U", Ự: "U",
  Y: "Y", Ỳ: "Y", Ỷ: "Y", Ỹ: "Y", Ý: "Y", Ỵ: "Y",
  Đ: "D",
};

/** Strip Vietnamese diacritics, lowercase, trim extra whitespace */
export function stripAccents(str) {
  let out = "";
  for (const ch of str) {
    out += ACCENT_MAP[ch] ?? ch;
  }
  return out.replace(/\s+/g, " ").trim().toLowerCase();
}
