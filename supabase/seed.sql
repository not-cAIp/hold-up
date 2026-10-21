-- Hold Up: labeled sample posts so the feed isn't empty on day one.
-- Run after schema.sql in Supabase → SQL Editor. Re-running replaces the samples.
-- Remove them any time with:  delete from profiles where is_sample;

delete from profiles where is_sample;

insert into profiles (id, display_name, is_sample) values
  ('59979dfd-65eb-5b93-add5-65f5fc127bdb', 'Ari', true),
  ('ab9a442c-1fd8-54ae-9bfd-3b220c17bab3', 'Jules', true),
  ('b26db37f-d6f8-5dec-b34d-858b41085f02', 'Kim', true),
  ('e321c737-4fa7-5ef1-b763-774c1f2a0eb9', 'Maya', true),
  ('72c608fc-139e-586b-b5a2-96edfb9e1fe5', 'Nina', true),
  ('eb488434-4f39-5a3c-9ec1-be0d47e7cc24', 'Priya', true),
  ('2cb94f63-d1c5-5233-8c31-183a3e62d5b8', 'Tess', true),
  ('3b7617da-001b-5582-8259-80d932b291f6', 'Zoe', true);

insert into posts (id, author, item, price, currency, reason, alt, status, created_at) values
  ('2363f8e0-b7ae-5d3b-96cf-52e0b80de89e', '59979dfd-65eb-5b93-add5-65f5fc127bdb', 'Concert hoodie from the tour', 85, 'USD', 'Last show of the tour and I won''t get another chance.', '', 'open', now() - interval '180 minutes'),
  ('02cecae9-ed4e-5117-9d1a-7c1a5fb86a79', 'ab9a442c-1fd8-54ae-9bfd-3b220c17bab3', 'Dyson Airwrap', 599, 'USD', 'My hair takes 40 minutes every morning. This would cut it in half.', 'A $40 round brush and a regular dryer', 'open', now() - interval '300 minutes'),
  ('bc36b0ae-6e45-5eca-831a-894d3334a48b', 'ab9a442c-1fd8-54ae-9bfd-3b220c17bab3', 'Skims soft lounge dress', 78, 'USD', 'It''s the comfiest thing I''ve ever tried on in store.', 'Lots of lounge sets already', 'skipped', now() - interval '2400 minutes'),
  ('ed238c14-ffb3-5a85-9d3e-ca74413a436f', 'b26db37f-d6f8-5dec-b34d-858b41085f02', '4-week pottery class', 160, 'USD', 'I want a hobby that isn''t my phone.', '', 'open', now() - interval '1200 minutes'),
  ('07fee85f-2b7a-5565-9378-39ce5dd1e39f', 'e321c737-4fa7-5ef1-b763-774c1f2a0eb9', 'Labubu blind box 2-pack', 56, 'USD', 'Everyone at work has one on their bag and I want the pink one so bad.', 'Three Jellycats on my bed', 'open', now() - interval '120 minutes'),
  ('29bd4c30-76bf-55e3-b11b-2e8a9d9d9e29', 'e321c737-4fa7-5ef1-b763-774c1f2a0eb9', 'Stanley Quencher in Rose Quartz', 45, 'USD', 'Mine leaks in my gym bag.', 'Two water bottles, one has a crack', 'skipped', now() - interval '1800 minutes'),
  ('beb53d88-5840-528e-adc3-6fe901bca199', '72c608fc-139e-586b-b5a2-96edfb9e1fe5', 'Lululemon Align leggings', 98, 'USD', 'Mine went see-through in squats. Embarrassing.', 'Two pairs of Amazon dupes', 'open', now() - interval '720 minutes'),
  ('3277f94e-1750-52b6-950d-cee86ff2ced1', 'eb488434-4f39-5a3c-9ec1-be0d47e7cc24', 'Sol de Janeiro Cheirosa 62 mist', 38, 'USD', 'I keep smelling it on people and getting compliments-envy.', 'Two body mists, both half full', 'open', now() - interval '60 minutes'),
  ('d7d322a9-1132-54f3-b1a7-aa3daf9f35a5', 'eb488434-4f39-5a3c-9ec1-be0d47e7cc24', 'iPad for taking class notes', 349, 'USD', 'Paper notes are a mess and I lose them before exams.', 'An old laptop that works', 'bought', now() - interval '1560 minutes'),
  ('085877c1-c8fb-507e-abae-a08242a7c625', '2cb94f63-d1c5-5233-8c31-183a3e62d5b8', 'Ugg Tasman slippers', 120, 'USD', 'Cold floors in my dorm and I''d wear these every single day.', 'Fuzzy socks from Target', 'open', now() - interval '540 minutes'),
  ('5373a8d4-2988-5b14-887b-6df19addf739', '3b7617da-001b-5582-8259-80d932b291f6', 'Charlotte Tilbury Flawless Filter', 49, 'USD', 'Saw it on 12 TikToks this week. It looks so glowy.', 'e.l.f. Halo Glow, barely used', 'open', now() - interval '420 minutes');

insert into votes (post_id, voter, verdict, comment, created_at) values
  ('07fee85f-2b7a-5565-9378-39ce5dd1e39f', '59979dfd-65eb-5b93-add5-65f5fc127bdb', 'approve', 'It''s $28 each, it makes you happy, get it.', now() - interval '90 minutes'),
  ('085877c1-c8fb-507e-abae-a08242a7c625', '59979dfd-65eb-5b93-add5-65f5fc127bdb', 'approve', 'You''ll use it every day', now() - interval '520 minutes'),
  ('5373a8d4-2988-5b14-887b-6df19addf739', '59979dfd-65eb-5b93-add5-65f5fc127bdb', 'deny', 'You literally have the dupe and it''s barely used.', now() - interval '410 minutes'),
  ('d7d322a9-1132-54f3-b1a7-aa3daf9f35a5', '59979dfd-65eb-5b93-add5-65f5fc127bdb', 'approve', 'You''ll use it every day for class', now() - interval '1540 minutes'),
  ('bc36b0ae-6e45-5eca-831a-894d3334a48b', '59979dfd-65eb-5b93-add5-65f5fc127bdb', 'approve', 'Comfy is a valid reason', now() - interval '2370 minutes'),
  ('07fee85f-2b7a-5565-9378-39ce5dd1e39f', 'ab9a442c-1fd8-54ae-9bfd-3b220c17bab3', 'deny', 'You have three Jellycats. The pink one will be sold out next week anyway.', now() - interval '110 minutes'),
  ('085877c1-c8fb-507e-abae-a08242a7c625', 'ab9a442c-1fd8-54ae-9bfd-3b220c17bab3', 'approve', 'Cold dorm floors are a real problem. Get them.', now() - interval '530 minutes'),
  ('beb53d88-5840-528e-adc3-6fe901bca199', 'ab9a442c-1fd8-54ae-9bfd-3b220c17bab3', 'deny', 'The Amazon ones are fine for squats. Save the $98.', now() - interval '690 minutes'),
  ('29bd4c30-76bf-55e3-b11b-2e8a9d9d9e29', 'ab9a442c-1fd8-54ae-9bfd-3b220c17bab3', 'approve', '', now() - interval '1770 minutes'),
  ('02cecae9-ed4e-5117-9d1a-7c1a5fb86a79', 'b26db37f-d6f8-5dec-b34d-858b41085f02', 'deny', 'Wait for Black Friday, it drops ~$100.', now() - interval '260 minutes'),
  ('085877c1-c8fb-507e-abae-a08242a7c625', 'b26db37f-d6f8-5dec-b34d-858b41085f02', 'approve', '', now() - interval '510 minutes'),
  ('beb53d88-5840-528e-adc3-6fe901bca199', 'b26db37f-d6f8-5dec-b34d-858b41085f02', 'approve', 'It replaces something broken', now() - interval '710 minutes'),
  ('d7d322a9-1132-54f3-b1a7-aa3daf9f35a5', 'b26db37f-d6f8-5dec-b34d-858b41085f02', 'approve', 'It replaces something broken', now() - interval '1550 minutes'),
  ('02cecae9-ed4e-5117-9d1a-7c1a5fb86a79', 'e321c737-4fa7-5ef1-b763-774c1f2a0eb9', 'approve', '40 min a day is 4+ hours a week. That''s worth it.', now() - interval '290 minutes'),
  ('3277f94e-1750-52b6-950d-cee86ff2ced1', 'e321c737-4fa7-5ef1-b763-774c1f2a0eb9', 'deny', 'You have one already', now() - interval '50 minutes'),
  ('beb53d88-5840-528e-adc3-6fe901bca199', 'e321c737-4fa7-5ef1-b763-774c1f2a0eb9', 'approve', 'See-through is a valid emergency.', now() - interval '700 minutes'),
  ('d7d322a9-1132-54f3-b1a7-aa3daf9f35a5', 'e321c737-4fa7-5ef1-b763-774c1f2a0eb9', 'deny', 'Your laptop works fine for notes.', now() - interval '1530 minutes'),
  ('02cecae9-ed4e-5117-9d1a-7c1a5fb86a79', '72c608fc-139e-586b-b5a2-96edfb9e1fe5', 'approve', 'You''ll use it every day', now() - interval '270 minutes'),
  ('085877c1-c8fb-507e-abae-a08242a7c625', '72c608fc-139e-586b-b5a2-96edfb9e1fe5', 'deny', 'Check for dupes, there are good $40 ones.', now() - interval '500 minutes'),
  ('ed238c14-ffb3-5a85-9d3e-ca74413a436f', '72c608fc-139e-586b-b5a2-96edfb9e1fe5', 'approve', 'An experience beats a thing every time.', now() - interval '1190 minutes'),
  ('5373a8d4-2988-5b14-887b-6df19addf739', '72c608fc-139e-586b-b5a2-96edfb9e1fe5', 'deny', 'Use up the e.l.f. first, then decide.', now() - interval '390 minutes'),
  ('bc36b0ae-6e45-5eca-831a-894d3334a48b', '72c608fc-139e-586b-b5a2-96edfb9e1fe5', 'deny', 'You have lots of lounge sets', now() - interval '2390 minutes'),
  ('07fee85f-2b7a-5565-9378-39ce5dd1e39f', 'eb488434-4f39-5a3c-9ec1-be0d47e7cc24', 'deny', 'Wait 48 hours first', now() - interval '100 minutes'),
  ('2363f8e0-b7ae-5d3b-96cf-52e0b80de89e', 'eb488434-4f39-5a3c-9ec1-be0d47e7cc24', 'approve', 'Merch from the last show is a memory, not a hoodie.', now() - interval '170 minutes'),
  ('5373a8d4-2988-5b14-887b-6df19addf739', 'eb488434-4f39-5a3c-9ec1-be0d47e7cc24', 'deny', 'The sale isn''t real', now() - interval '400 minutes'),
  ('29bd4c30-76bf-55e3-b11b-2e8a9d9d9e29', 'eb488434-4f39-5a3c-9ec1-be0d47e7cc24', 'deny', 'Fix the lid or just carry the other one.', now() - interval '1790 minutes'),
  ('02cecae9-ed4e-5117-9d1a-7c1a5fb86a79', '2cb94f63-d1c5-5233-8c31-183a3e62d5b8', 'deny', 'The Shark FlexStyle is half the price.', now() - interval '280 minutes'),
  ('3277f94e-1750-52b6-950d-cee86ff2ced1', '2cb94f63-d1c5-5233-8c31-183a3e62d5b8', 'deny', 'Finish the two you have first!', now() - interval '40 minutes'),
  ('ed238c14-ffb3-5a85-9d3e-ca74413a436f', '2cb94f63-d1c5-5233-8c31-183a3e62d5b8', 'approve', '', now() - interval '1180 minutes'),
  ('29bd4c30-76bf-55e3-b11b-2e8a9d9d9e29', '2cb94f63-d1c5-5233-8c31-183a3e62d5b8', 'deny', 'You have one already', now() - interval '1780 minutes'),
  ('07fee85f-2b7a-5565-9378-39ce5dd1e39f', '3b7617da-001b-5582-8259-80d932b291f6', 'deny', '', now() - interval '80 minutes'),
  ('3277f94e-1750-52b6-950d-cee86ff2ced1', '3b7617da-001b-5582-8259-80d932b291f6', 'approve', 'It''s $38 and it''s your signature scent era.', now() - interval '30 minutes'),
  ('2363f8e0-b7ae-5d3b-96cf-52e0b80de89e', '3b7617da-001b-5582-8259-80d932b291f6', 'approve', 'You deserve it', now() - interval '160 minutes'),
  ('ed238c14-ffb3-5a85-9d3e-ca74413a436f', '3b7617da-001b-5582-8259-80d932b291f6', 'deny', 'Try a single drop-in class first', now() - interval '1170 minutes'),
  ('bc36b0ae-6e45-5eca-831a-894d3334a48b', '3b7617da-001b-5582-8259-80d932b291f6', 'deny', 'Wait 48 hours first', now() - interval '2380 minutes');

insert into likes (post_id, voter, liker) values
  ('085877c1-c8fb-507e-abae-a08242a7c625', 'ab9a442c-1fd8-54ae-9bfd-3b220c17bab3', '59979dfd-65eb-5b93-add5-65f5fc127bdb'),
  ('beb53d88-5840-528e-adc3-6fe901bca199', 'e321c737-4fa7-5ef1-b763-774c1f2a0eb9', '59979dfd-65eb-5b93-add5-65f5fc127bdb'),
  ('2363f8e0-b7ae-5d3b-96cf-52e0b80de89e', 'eb488434-4f39-5a3c-9ec1-be0d47e7cc24', 'ab9a442c-1fd8-54ae-9bfd-3b220c17bab3'),
  ('5373a8d4-2988-5b14-887b-6df19addf739', '59979dfd-65eb-5b93-add5-65f5fc127bdb', 'ab9a442c-1fd8-54ae-9bfd-3b220c17bab3'),
  ('07fee85f-2b7a-5565-9378-39ce5dd1e39f', '59979dfd-65eb-5b93-add5-65f5fc127bdb', 'b26db37f-d6f8-5dec-b34d-858b41085f02'),
  ('02cecae9-ed4e-5117-9d1a-7c1a5fb86a79', 'e321c737-4fa7-5ef1-b763-774c1f2a0eb9', 'b26db37f-d6f8-5dec-b34d-858b41085f02'),
  ('ed238c14-ffb3-5a85-9d3e-ca74413a436f', '3b7617da-001b-5582-8259-80d932b291f6', 'b26db37f-d6f8-5dec-b34d-858b41085f02'),
  ('02cecae9-ed4e-5117-9d1a-7c1a5fb86a79', 'b26db37f-d6f8-5dec-b34d-858b41085f02', 'e321c737-4fa7-5ef1-b763-774c1f2a0eb9'),
  ('2363f8e0-b7ae-5d3b-96cf-52e0b80de89e', 'eb488434-4f39-5a3c-9ec1-be0d47e7cc24', 'e321c737-4fa7-5ef1-b763-774c1f2a0eb9'),
  ('ed238c14-ffb3-5a85-9d3e-ca74413a436f', '72c608fc-139e-586b-b5a2-96edfb9e1fe5', 'e321c737-4fa7-5ef1-b763-774c1f2a0eb9'),
  ('02cecae9-ed4e-5117-9d1a-7c1a5fb86a79', 'e321c737-4fa7-5ef1-b763-774c1f2a0eb9', '72c608fc-139e-586b-b5a2-96edfb9e1fe5'),
  ('07fee85f-2b7a-5565-9378-39ce5dd1e39f', 'ab9a442c-1fd8-54ae-9bfd-3b220c17bab3', 'eb488434-4f39-5a3c-9ec1-be0d47e7cc24'),
  ('02cecae9-ed4e-5117-9d1a-7c1a5fb86a79', '2cb94f63-d1c5-5233-8c31-183a3e62d5b8', 'eb488434-4f39-5a3c-9ec1-be0d47e7cc24'),
  ('085877c1-c8fb-507e-abae-a08242a7c625', '72c608fc-139e-586b-b5a2-96edfb9e1fe5', 'eb488434-4f39-5a3c-9ec1-be0d47e7cc24'),
  ('5373a8d4-2988-5b14-887b-6df19addf739', '59979dfd-65eb-5b93-add5-65f5fc127bdb', 'eb488434-4f39-5a3c-9ec1-be0d47e7cc24'),
  ('07fee85f-2b7a-5565-9378-39ce5dd1e39f', 'ab9a442c-1fd8-54ae-9bfd-3b220c17bab3', '2cb94f63-d1c5-5233-8c31-183a3e62d5b8'),
  ('02cecae9-ed4e-5117-9d1a-7c1a5fb86a79', 'b26db37f-d6f8-5dec-b34d-858b41085f02', '2cb94f63-d1c5-5233-8c31-183a3e62d5b8'),
  ('beb53d88-5840-528e-adc3-6fe901bca199', 'e321c737-4fa7-5ef1-b763-774c1f2a0eb9', '2cb94f63-d1c5-5233-8c31-183a3e62d5b8'),
  ('5373a8d4-2988-5b14-887b-6df19addf739', '59979dfd-65eb-5b93-add5-65f5fc127bdb', '2cb94f63-d1c5-5233-8c31-183a3e62d5b8'),
  ('02cecae9-ed4e-5117-9d1a-7c1a5fb86a79', 'e321c737-4fa7-5ef1-b763-774c1f2a0eb9', '3b7617da-001b-5582-8259-80d932b291f6'),
  ('3277f94e-1750-52b6-950d-cee86ff2ced1', '2cb94f63-d1c5-5233-8c31-183a3e62d5b8', '3b7617da-001b-5582-8259-80d932b291f6'),
  ('ed238c14-ffb3-5a85-9d3e-ca74413a436f', '72c608fc-139e-586b-b5a2-96edfb9e1fe5', '3b7617da-001b-5582-8259-80d932b291f6');
