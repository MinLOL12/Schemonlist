-- ============================================================================
--  SCHEMONLIST — optional starter data
-- ============================================================================
--  Run this AFTER supabase/schema.sql if you want a ready-made demonlist to
--  play with. It inserts 15 ranked levels. Video links point at YouTube
--  searches so they are always valid — replace them with the real verification
--  videos from the admin panel.
--
--  Safe to re-run: rows are matched by slug and skipped if they exist.
-- ============================================================================

insert into public.levels (slug, name, creators, publisher, tier, rank, video_url, description, is_listed)
values
  ('acheron', 'Acheron', array['Ryamu'], 'Ryamu', 'extreme', 1,
   'https://www.youtube.com/results?search_query=acheron+geometry+dash+verification',
   'The current #1. A brutal extension of Sunset Sandstorm with some of the tightest timings ever verified.', true),

  ('slaughterhouse', 'Slaughterhouse', array['IcEDCave'], 'IcEDCave', 'extreme', 2,
   'https://www.youtube.com/results?search_query=slaughterhouse+geometry+dash+verification',
   'Skill-based, timing-heavy and famously long. One of the biggest verification projects of its era.', true),

  ('sakupen-circles', 'Sakupen Circles', array['Yunhasn''t'], 'Yunhasn''t', 'extreme', 3,
   'https://www.youtube.com/results?search_query=sakupen+circles+geometry+dash',
   'Fast-paced extreme demon with a notorious pre-drop and a very unforgiving ending.', true),

  ('tartarus', 'Tartarus', array['Dolphy'], 'Dolphy', 'extreme', 4,
   'https://www.youtube.com/results?search_query=tartarus+geometry+dash+verification',
   'A landmark extreme demon built around straight-fly and memory gameplay.', true),

  ('silent-clubstep', 'Silent Clubstep', array['Sailent'], 'Sailent', 'extreme', 5,
   'https://www.youtube.com/results?search_query=silent+clubstep+geometry+dash',
   'An infamous reboot of an impossible classic, rebuilt to be humanly possible — barely.', true),

  ('the-yandere', 'The Yandere', array['Renn241'], 'Renn241', 'extreme', 6,
   'https://www.youtube.com/results?search_query=the+yandere+geometry+dash',
   'Timing-heavy extreme demon with dense, punishing gameplay and a fast-paced finale.', true),

  ('bloodlust', 'Bloodlust', array['Knobbelboy'], 'Knobbelboy', 'extreme', 7,
   'https://www.youtube.com/results?search_query=bloodlust+geometry+dash+verification',
   'A legendary extreme demon and one of the most watched verifications in GD history.', true),

  ('zodiac', 'Zodiac', array['Bianox'], 'Bianox', 'extreme', 8,
   'https://www.youtube.com/results?search_query=zodiac+geometry+dash',
   'Extremely consistent, extremely hard, and famous for its brutal consistency requirement.', true),

  ('sonic-wave', 'Sonic Wave', array['Sunix'], 'Sunix', 'extreme', 9,
   'https://www.youtube.com/results?search_query=sonic+wave+geometry+dash',
   'The wave challenge that defined an entire generation of extreme demons.', true),

  ('yatagarasu', 'Yatagarasu', array['TrusTa'], 'TrusTa', 'extreme', 10,
   'https://www.youtube.com/results?search_query=yatagarasu+geometry+dash',
   'A classic extreme demon with a punishing dual section and a long, tense ending.', true),

  ('erebus', 'Erebus', array['Rustam'], 'Rustam', 'extreme', 11,
   'https://www.youtube.com/results?search_query=erebus+geometry+dash',
   'Straight-fly heavy extreme demon with a fearsome final wave.', true),

  ('kenos', 'Kenos', array['Bianox'], 'Bianox', 'extreme', 12,
   'https://www.youtube.com/results?search_query=kenos+geometry+dash',
   'Widely regarded as a top-tier extreme thanks to its precise, low-margin gameplay.', true),

  ('cataclysm', 'Cataclysm', array['Ggb0y'], 'Ggb0y', 'insane', 13,
   'https://www.youtube.com/results?search_query=cataclysm+geometry+dash',
   'An old-school insane demon that is still considered one of the best levels ever made.', true),

  ('artificial-ascent', 'Artificial Ascent', array['Serponge'], 'Serponge', 'insane', 14,
   'https://www.youtube.com/results?search_query=artificial+ascent+geometry+dash',
   'A visually stunning insane demon with creative decoration and varied gameplay.', true),

  ('plasma-pulse-finale', 'Plasma Pulse Finale', array['Zmx'], 'Zmx', 'insane', 15,
   'https://www.youtube.com/results?search_query=plasma+pulse+finale+geometry+dash',
   'The definitive Plasma Pulse level: fast, bright and relentlessly demanding.', true)
on conflict (slug) do nothing;

-- Points are filled in automatically by the levels_set_points trigger.
-- ============================================================================
