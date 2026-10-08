-- Seed the production catalog with the top-level categories required by service/project forms.
INSERT INTO public.categories (name_ar, name_en, slug, icon, sort_order)
VALUES
  ('برمجة وتطوير', 'Programming & Development', 'programming-development', 'Code2', 10),
  ('تصميم', 'Design', 'design', 'Palette', 20),
  ('تسويق رقمي', 'Digital Marketing', 'digital-marketing', 'Megaphone', 30),
  ('كتابة وترجمة', 'Writing & Translation', 'writing-translation', 'Languages', 40),
  ('فيديو وأنيميشن', 'Video & Animation', 'video-animation', 'Video', 50),
  ('صوتيات', 'Audio', 'audio', 'Mic2', 60),
  ('بيانات وذكاء اصطناعي', 'Data & AI', 'data-ai', 'BrainCircuit', 70),
  ('تعليم وتدريب', 'Education & Training', 'education-training', 'GraduationCap', 80),
  ('أعمال واستشارات', 'Business & Consulting', 'business-consulting', 'BriefcaseBusiness', 90),
  ('خدمات شخصية', 'Personal Services', 'personal-services', 'Sparkles', 100)
ON CONFLICT (slug) DO NOTHING;