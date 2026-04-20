# منظومة الطلاب الضعاف 🏫

نظام متكامل لجمع وإدارة بيانات الطلاب الضعاف في المرحلة الابتدائية، مبني على **Next.js 14** + **Supabase** + **TypeScript** + **Tailwind CSS**.

---

## 🗂️ هيكل المشروع

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # API Routes
│   │   ├── auth/           # تسجيل الدخول والخروج
│   │   ├── upload/         # رفع ملفات Excel
│   │   ├── students/       # استعراض الطلاب
│   │   ├── schools/        # إدارة المدارس
│   │   ├── stats/          # الإحصائيات
│   │   ├── export/         # تصدير Excel
│   │   ├── admin/password/ # تغيير كلمة مرور الأدمن
│   │   └── school/data/    # حذف بيانات المدرسة
│   ├── dashboard/
│   │   ├── admin/          # لوحة الأدمن
│   │   └── school/         # لوحة المدرسة
│   └── login/              # صفحة تسجيل الدخول
├── components/
│   ├── admin/              # مكونات لوحة الأدمن
│   ├── school/             # مكونات لوحة المدرسة
│   ├── shared/             # مكونات مشتركة (TopBar)
│   └── ui/                 # مكونات UI أساسية
├── lib/
│   ├── supabase.ts         # Supabase clients
│   └── session.ts          # إدارة الجلسات
├── services/
│   ├── excelParser.ts      # تحليل ملفات Excel
│   ├── excelExport.ts      # تصدير Excel
│   ├── schoolService.ts    # منطق المدارس
│   └── studentService.ts   # منطق الطلاب
├── types/index.ts          # TypeScript types
└── middleware.ts            # حماية المسارات
supabase/
└── SUPABASE_SCHEMA.sql     # SQL لإنشاء قاعدة البيانات
```

---

## 🚀 تشغيل المشروع محلياً

### المتطلبات
- Node.js 18+
- حساب Supabase (مجاني)

### الخطوات

**1. استنساخ المشروع**
```bash
git clone https://github.com/YOUR_USERNAME/weak-students-system.git
cd weak-students-system
npm install
```

**2. إنشاء مشروع Supabase**
- اذهب إلى [supabase.com](https://supabase.com) وأنشئ مشروعاً جديداً
- من القائمة: **Settings → API** انسخ:
  - `Project URL`
  - `anon public key`
  - `service_role key`

**3. إنشاء قاعدة البيانات**
- في لوحة Supabase: **SQL Editor → New query**
- الصق محتوى ملف `supabase/SUPABASE_SCHEMA.sql` وشغّله

**4. إنشاء Storage Bucket** (اختياري - لحفظ ملفات Excel الأصلية)
- في لوحة Supabase: **Storage → New bucket**
- الاسم: `excel-uploads` | النوع: Private

**5. إعداد متغيرات البيئة**
```bash
cp .env.local.example .env.local
```
عدّل `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**6. تشغيل التطبيق**
```bash
npm run dev
```
افتح: [http://localhost:3000](http://localhost:3000)

---

## 🔐 بيانات الدخول الافتراضية

| الدور | المعرف | كلمة المرور |
|-------|--------|-------------|
| أدمن | `admin` | `admin123` |
| مدرسة | كود المدرسة | كلمة مرور تُحدد عند الإضافة |

> **مهم**: غيّر كلمة مرور الأدمن فور الدخول الأول من إعدادات لوحة التحكم.

---

## 📤 إضافة أول مدرسة

1. سجّل دخول كأدمن
2. اذهب إلى تبويب **➕ إضافة مدرسة**
3. أدخل: الكود، الاسم، النوعية، كلمة مرور المدرسة
4. احفظ — الآن يمكن للمدرسة الدخول بكودها وكلمة مرورها

---

## 📊 تنسيق ملف Excel المطلوب

```
الإدارة:    [اسم الإدارة التعليمية]
المدرسة:   [اسم المدرسة]
العنوان:    [عنوان المدرسة]

م    اسم التلميذ رباعياً    الصف       الفصل
1    أحمد محمد علي حسن      الرابع     الأول
2    فاطمة سعيد عبدالله     الخامس     الثاني
...
```

---

## ☁️ النشر على Vercel

```bash
# تثبيت Vercel CLI
npm i -g vercel

# ربط المشروع ونشره
vercel --prod
```

في لوحة Vercel → **Settings → Environment Variables** أضف نفس المتغيرات من `.env.local`.

---

## 🔧 التقنيات المستخدمة

| التقنية | الدور |
|---------|-------|
| Next.js 14 App Router | إطار العمل الأساسي |
| TypeScript | أمان الأنواع |
| Supabase (PostgreSQL) | قاعدة البيانات + التخزين |
| Tailwind CSS | التصميم |
| Recharts | الرسوم البيانية |
| xlsx (SheetJS) | قراءة وكتابة Excel |
| Zod | التحقق من البيانات |
| bcryptjs | تشفير كلمات المرور |

---

## 📄 الترخيص

MIT License — للاستخدام الحر
