// ✅ مصدر واحد لعنوان السيرفر — استخدم هذا الملف في كل الصفحات
// بدل ما تكتب الرابط مباشرة، اعمل: import API_BASE from '../config/api';
const API_BASE =
  process.env.REACT_APP_API_URL ||
  "https://inspection-server-4nvj.onrender.com";

export default API_BASE;
