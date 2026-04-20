# ARCHITECTURE.md — قرارات التصميم المعماري

## لماذا Next.js App Router؟

- **Server Components بالافتراضي**: قراءة الجلسة من cookies في الخادم مباشرة دون كشف البيانات للعميل.
- **API Routes مدمجة**: لا حاجة لخادم Express منفصل — كل شيء في مشروع واحد.
- **Middleware للحماية**: حماية المسارات عند الـ Edge قبل وصول الطلب للصفحة.
- **`output: 'standalone'`**: يُنتج حزمة قابلة للنشر على Docker أو Vercel بدون Node.js كامل.

## لماذا Supabase؟

- **PostgreSQL مُدار**: لا إدارة للخوادم، نسخ احتياطية تلقائية.
- **Row Level Security (RLS)**: طبقة حماية إضافية على مستوى قاعدة البيانات — حتى لو تسرّب الـ anon key لا يمكن الوصول للبيانات.
- **Storage مدمج**: لحفظ ملفات Excel الأصلية دون خدمة ثالثة.
- **لوحة تحكم بصرية**: إدارة البيانات مباشرة بدون SQL في أغلب الحالات.

## نمط الأمان: Service Role في API فقط

```
Browser → API Route (Next.js) → Supabase (service_role key)
                ↑
         التحقق من الجلسة هنا
```

- الـ `anon key` لا يُستخدم للعمليات الحساسة — الـ `service_role key` يُستخدم فقط في API Routes (server-side).
- لا يصل أي بيانات حساسة للمتصفح.

## نظام الجلسات (Session)

استخدمنا **Cookie مشفّر بـ Base64** بدلاً من JWT معقد لأسباب:
1. البساطة — المشروع نظام داخلي لا يحتاج توقيع تشفيري معقد.
2. **للإنتاج الحقيقي**: استبدل `src/lib/session.ts` بـ [`iron-session`](https://github.com/vvo/iron-session) أو `jose` للحصول على توقيع تشفيري آمن.

## فصل طبقات الكود (Service Layer)

```
API Route → Service → Supabase Client
```

- **API Routes**: تتحقق من الصلاحيات فقط، لا منطق عمل.
- **Services**: كل منطق العمل هنا (schoolService، studentService، excelParser).
- **Supabase Client**: طبقة الوصول للبيانات فقط.

هذا يجعل إضافة ميزات جديدة لاحقاً (مثل إشعارات أو تقارير متقدمة) سهلة دون تعارض.

## معالجة Excel — استراتيجية المرونة

محلل Excel (`excelParser.ts`) يعمل بطريقتين:
1. **الكشف التلقائي**: يبحث في أول 15 صف عن كلمات مفتاحية (الإدارة، المدرسة، العنوان).
2. **الكشف بالموضع**: إذا لم يجد رؤوس الأعمدة، يفترض الترتيب الافتراضي (م، الاسم، الصف، الفصل).

## خطة التوسع المستقبلي

| الميزة | كيف تُضاف |
|--------|-----------|
| إشعارات WhatsApp | Service جديد في `services/notificationService.ts` |
| تقارير PDF | `services/pdfService.ts` مع `pdfmake` |
| تعدد الأعوام الدراسية | إضافة `academic_year` لجدولي `uploads` و`students` |
| صلاحيات متعددة | توسيع `SessionUser.role` بأدوار جديدة |
| إحصائيات متقدمة | API endpoint جديد `/api/analytics` |
