# طلبات العرض التجريبي — جزء السيرفر

الفرونت اند جاهز على `main`:

- `/demo`: الصفحة العامة (`src/pages/DemoRequest.jsx`).
- زر "Request a free demo" بصفحة تسجيل الدخول.
- Platform Center ← **Demo Requests**: شاشة المتابعة (`src/pages/settings/DemoRequestsTab.jsx`).

هاد المجلد فيه الجزء اللي لازم ينضاف لمستودع السيرفر (Express + Postgres).

## الخطوات

### 1. انسخ الملف
انسخ `demoRequests.cjs` لمجلد الـ routes بالسيرفر، مثلاً `routes/demoRequests.cjs`.
ما بيحتاج أي مكتبة جديدة، والجدول `demo_requests` بينعمل لحاله أول ما يشتغل السيرفر.

### 2. ركّبه بالملف الرئيسي للسيرفر
حطه **قبل** أي middleware بيطلب تسجيل دخول لكل `/api`، لأن الـ `POST` لازم يشتغل بدون تسجيل دخول:

```js
const demoRequestsRouter = require("./routes/demoRequests.cjs");

app.use(
  "/api/demo-requests",
  demoRequestsRouter({
    pool,                // نفس الـ pg Pool اللي بيستعمله السيرفر
    requireSuperAdmin,   // نفس الحماية المستعملة على /api/companies
    sendMail,            // اختياري: الدالة اللي ورا /api/email/send
  })
);
```

- إذا الأسماء عندك مختلفة (مثلاً `db` بدل `pool`، أو `superAdminOnly` بدل `requireSuperAdmin`)، مرّر اللي عندك.
- إذا في middleware عام بيرفض أي طلب بدون توكن، استثني منه `POST /api/demo-requests` بس. الـ `GET` و `PATCH` و `DELETE` لازم يضلوا للأدمن الرئيسي بس.
- `sendMail` لازم تقبل `{ to, subject, text, html }`. إذا ما مرّرتها، الطلبات بتنحفظ عادي، بس ما بيوصلك إيميل.

### 3. متغيرات البيئة على Render
| المتغير | القيمة | ليش |
|---|---|---|
| `DEMO_NOTIFY_EMAIL` | إيميلك | وين يوصلك التنبيه بكل طلب جديد |
| `APP_PUBLIC_URL` | رابط الموقع، مثلاً `https://your-app.netlify.app` | ليطلع بالإيميل رابط مباشر لشاشة المتابعة |

### 4. CORS
إذا السيرفر بيحدد المواقع المسموحة (CORS)، الـ `/demo` نفس دومين الموقع، فما بيحتاج أي تغيير.

## الـ API

| الطريقة | الرابط | مين | شو بيعمل |
|---|---|---|---|
| POST | `/api/demo-requests` | أي حدا | بيحفظ الطلب وبيبعت إيميل. بيرجّع `201 { ok, id }` |
| GET | `/api/demo-requests` | الأدمن الرئيسي | `{ ok, requests: [...] }` |
| PATCH | `/api/demo-requests/:id` | الأدمن الرئيسي | بيعدّل `{ status?, notes? }` |
| DELETE | `/api/demo-requests/:id` | الأدمن الرئيسي | حذف (للسبام أو التكرار) |

الحالات: `new`، `contacted`، `demo_done`، `trial`، `won`، `lost`.

**الحماية:**
- حقل مخفي (`website`) بيكشف الروبوتات: الطلب بيرجع "نجح" بس ما بينحفظ.
- حد 5 طلبات بالساعة من نفس الـ IP: الزيادة بترجع `429`.
- كل حقل إله حد أقصى للطول.
- الإيميل بينبعت بعد ما الطلب ينحفظ، فأي مشكلة بالإيميل ما بتضيّع الطلب.

## التجربة بعد الرفع
1. افتح `https://موقعك/demo`، عبّي النموذج، واكبس إرسال.
2. لازم يوصلك إيميل على `DEMO_NOTIFY_EMAIL`.
3. افتح Platform Center ← Demo Requests: الطلب بيطلع بحالة **New**.

## تتبّع المصدر
شارك الرابط مع اسم المصدر، وكل طلب بيطلع جنبه من وين إجا:
- `https://موقعك/demo?src=linkedin`
- `https://موقعك/demo?src=gulfood`
- `https://موقعك/demo?src=whatsapp`
- `https://موقعك/demo?lang=ar` بيفتح الصفحة بالعربي مباشرة.
