const IMG_BASE = process.env.BASE_IMAGE_URL || "http://localhost:3000/api/images/";

function normalizeImageUrl(u) {
  if (!u) return "";
  if (/^https?:\/\//i.test(u) || u.startsWith("data:")) return u;
  // hỗ trợ "ao1.jpg", "/images/ao1.jpg"
  if (u.startsWith("/")) u = u.slice(1);
  return IMG_BASE.replace(/\/$/, "/") + u.replace(/^images\//, "");
}

module.exports = { normalizeImageUrl };
