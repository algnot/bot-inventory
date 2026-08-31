This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Supabase

คลังกล่อง เจ้าของ การ์ดในกล่อง และแคตตาล็อกการ์ด เก็บบน Supabase ได้

ถ้าตารางอื่นมีอยู่แล้ว ให้รัน `supabase/cards.sql` ด้วย เพื่อให้ปุ่มซิงก์การ์ดเขียนลงฐานข้อมูลได้ (บน Vercel เขียนไฟล์ไม่ได้)

1. สร้างโปรเจกต์ที่ [supabase.com](https://supabase.com)
2. เปิด SQL Editor วางเนื้อหาใน `supabase/schema.sql` แล้วกด Run
3. ที่ Project Settings → API คัดลอก Project URL และคีย์ใส่ `.env.local`
   (Secret `sb_secret_...` หรือ Publishable `sb_publishable_...` ก็ได้):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

ถ้าใช้ publishable key แล้วเจอ RLS ให้รัน `supabase/rls.sql` ใน SQL Editor ด้วย

4. รีสตาร์ท `npm run dev`

ถ้ายังไม่ใส่คีย์ แอปจะใช้ `data/store.json` ในเครื่องเหมือนเดิม หน้าแรกจะขึ้นว่า **คลาวด์ Supabase** เมื่อต่อสำเร็จ

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
