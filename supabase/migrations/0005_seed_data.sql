-- 0005_seed_data.sql
-- Subscription plan catalogue. Idempotent.

insert into public.subscription_plans (code, name_th, name_en, description_th, description_en,
  price_thb_monthly, price_thb_yearly, max_users, max_storage_mb, max_ai_requests, features, sort_order)
values
  ('free', 'ทดลองใช้งาน', 'Free Trial',
   'แพ็กเกจทดลองใช้งาน 30 วัน เหมาะสำหรับการประเมินระบบ',
   '30-day trial. Limited features for evaluation.',
   0, 0, 5, 500, 100,
   '{"ai_chat": true, "ocr": false, "workflows": false, "audit_log": false}'::jsonb, 1),

  ('starter', 'เริ่มต้น', 'Starter',
   'เหมาะสำหรับโรงเรียนขนาดเล็ก',
   'For small schools.',
   1990, 19900, 25, 10000, 2000,
   '{"ai_chat": true, "ocr": true, "workflows": true, "audit_log": true, "support": "email"}'::jsonb, 2),

  ('pro', 'โปร', 'Professional',
   'เหมาะสำหรับโรงเรียนมัธยม วิทยาลัย และมหาวิทยาลัย',
   'For secondary schools, colleges, and universities.',
   4990, 49900, 100, 50000, 10000,
   '{"ai_chat": true, "ocr": true, "workflows": true, "audit_log": true, "support": "priority", "tor_generator": true, "memo_generator": true}'::jsonb, 3),

  ('enterprise', 'องค์กร', 'Enterprise',
   'สำหรับมหาวิทยาลัยและองค์กรขนาดใหญ่ ปรับแต่งได้',
   'For large universities and multi-campus organizations. Custom contract.',
   0, 0, null, null, null,
   '{"ai_chat": true, "ocr": true, "workflows": true, "audit_log": true, "support": "dedicated", "tor_generator": true, "memo_generator": true, "sso": true, "white_label": true, "sla": true}'::jsonb, 4)
on conflict (code) do update set
  name_th = excluded.name_th,
  name_en = excluded.name_en,
  description_th = excluded.description_th,
  description_en = excluded.description_en,
  price_thb_monthly = excluded.price_thb_monthly,
  price_thb_yearly = excluded.price_thb_yearly,
  max_users = excluded.max_users,
  max_storage_mb = excluded.max_storage_mb,
  max_ai_requests = excluded.max_ai_requests,
  features = excluded.features,
  sort_order = excluded.sort_order,
  updated_at = now();
