-- =====================================================================
-- Seed data.  Test passwords (bcrypt, cost 10):
--   admin@valenzuela.gov.ph    Admin@123
--   staff@valenzuela.gov.ph    Staff@123
--   resident@example.com       Resident@123
-- =====================================================================

INSERT INTO report_categories (name, slug, icon, sort_order) VALUES
  ('Garbage',          'garbage',          'trash',     1),
  ('Road Damage',      'road-damage',      'road',      2),
  ('Flood',            'flood',            'water',     3),
  ('Crime',            'crime',            'shield',    4),
  ('Fire',             'fire',             'fire',      5),
  ('Water Leak',       'water-leak',       'droplet',   6),
  ('Street Lights',    'street-lights',    'bulb',      7),
  ('Fallen Trees',     'fallen-trees',     'tree',      8),
  ('Animal Concerns',  'animal-concerns',  'paw',       9),
  ('Illegal Parking',  'illegal-parking',  'car',      10),
  ('Lost & Found',     'lost-found',       'search',   11),
  ('Other',            'other',            'flag',     12);

INSERT INTO users (first_name, last_name, email, phone, password_hash, role, barangay, address, position) VALUES
  ('Maria',   'Santos',   'admin@valenzuela.gov.ph',    '09171234567', '$2b$10$cKZ4ZJq1Rd8EPhjuXFZn7OlCjdHvCrLO4JOsUBphRuwU6M1XpTruu', 'admin',    'Ugong',            'Valenzuela City Hall, McArthur Highway', 'City Administrator'),
  ('Jose',    'Dela Cruz','staff@valenzuela.gov.ph',    '09181234567', '$2b$10$02E3PUAy2hLVkP0pIX9Y6.e2y.dW.MLO8mIodqT76AgKO2zakc1ci', 'staff',    'Ugong',            'Barangay Ugong Hall',                    'Field Response Officer'),
  ('Ana',     'Reyes',    'resident@example.com',       '09191234567', '$2b$10$ZxQI/ueJpoV7oLYRPuyveeu2NvcJ0bQ1iyMQqgmBjuJsHAtu3FPY.', 'resident', 'Ugong',            '12 Sampaguita St., Ugong',               NULL),
  ('Rolando', 'Bautista', 'staff2@valenzuela.gov.ph',   '09182234567', '$2b$10$02E3PUAy2hLVkP0pIX9Y6.e2y.dW.MLO8mIodqT76AgKO2zakc1ci', 'staff',    'Gen. T. De Leon',  'Barangay Gen. T. De Leon Hall',          'Sanitation Lead'),
  ('Liza',    'Manalo',   'resident2@example.com',      '09192234567', '$2b$10$ZxQI/ueJpoV7oLYRPuyveeu2NvcJ0bQ1iyMQqgmBjuJsHAtu3FPY.', 'resident', 'Gen. T. De Leon',  '45 Narra St., Gen. T. De Leon',          NULL),
  ('Carlo',   'Villanueva','resident3@example.com',     '09193234567', '$2b$10$ZxQI/ueJpoV7oLYRPuyveeu2NvcJ0bQ1iyMQqgmBjuJsHAtu3FPY.', 'resident', 'Ugong',            '8 Ilang-Ilang St., Ugong',               NULL);

INSERT INTO reports (reference_no, user_id, category_id, assigned_to, title, description, address, barangay, priority, status, is_anonymous, assigned_at, resolved_at, created_at) VALUES
  ('VCRS-2026-000001', 3, 2, 2, 'Deep pothole near the covered court',        'A pothole about two feet wide has opened on the road beside the covered court. Tricycles swerve into the opposite lane to avoid it.', 'Sampaguita St., near Ugong covered court', 'Ugong', 'high',     'in_progress', 0, DATE_SUB(NOW(), INTERVAL 4 DAY), NULL, DATE_SUB(NOW(), INTERVAL 5 DAY)),
  ('VCRS-2026-000002', 5, 1, 4, 'Uncollected garbage at corner lot',          'Garbage has not been collected for four days at the corner lot. Strong smell and stray animals scattering the trash.', 'Narra St. corner Acacia St.', 'Gen. T. De Leon', 'medium',  'resolved',    0, DATE_SUB(NOW(), INTERVAL 9 DAY), DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_SUB(NOW(), INTERVAL 10 DAY)),
  ('VCRS-2026-000003', 6, 7, NULL,'Three street lights out along the alley',  'The alley going to the chapel is completely dark at night. Three posts in a row have no lights.', 'Ilang-Ilang St. alley', 'Ugong', 'medium', 'pending', 0, NULL, NULL, DATE_SUB(NOW(), INTERVAL 2 DAY)),
  ('VCRS-2026-000004', 3, 3, NULL,'Street floods after 30 minutes of rain',   'Water reaches knee level in front of the sari-sari store whenever it rains hard. The drainage looks blocked.', 'Sampaguita St., in front of Aling Bebang store', 'Ugong', 'critical', 'verified', 0, NULL, NULL, DATE_SUB(NOW(), INTERVAL 1 DAY)),
  ('VCRS-2026-000005', 5, 10, 4,'Truck blocking the corner every night',      'A delivery truck parks across the corner from 9pm onwards. Cars cannot turn and residents have to back out of the street.', 'Acacia St. corner', 'Gen. T. De Leon', 'low', 'assigned', 1, DATE_SUB(NOW(), INTERVAL 1 DAY), NULL, DATE_SUB(NOW(), INTERVAL 3 DAY)),
  ('VCRS-2026-000006', 6, 8, 2,'Fallen acacia branch on the sidewalk',        'A large branch fell during the storm and is blocking the whole sidewalk. Children walk on the road to get around it.', 'Ilang-Ilang St., beside the basketball court', 'Ugong', 'high', 'closed', 0, DATE_SUB(NOW(), INTERVAL 20 DAY), DATE_SUB(NOW(), INTERVAL 18 DAY), DATE_SUB(NOW(), INTERVAL 21 DAY));

INSERT INTO report_timeline (report_id, status, note, actor_id, created_at) VALUES
  (1,'pending','Report submitted by resident.',3, DATE_SUB(NOW(), INTERVAL 5 DAY)),
  (1,'verified','Photos reviewed and location confirmed.',1, DATE_SUB(NOW(), INTERVAL 5 DAY)),
  (1,'assigned','Assigned to Jose Dela Cruz.',1, DATE_SUB(NOW(), INTERVAL 4 DAY)),
  (1,'in_progress','Road patching scheduled this week.',2, DATE_SUB(NOW(), INTERVAL 3 DAY)),
  (2,'pending','Report submitted by resident.',5, DATE_SUB(NOW(), INTERVAL 10 DAY)),
  (2,'verified','Confirmed with the collection schedule.',1, DATE_SUB(NOW(), INTERVAL 10 DAY)),
  (2,'assigned','Assigned to Rolando Bautista.',1, DATE_SUB(NOW(), INTERVAL 9 DAY)),
  (2,'in_progress','Truck dispatched.',4, DATE_SUB(NOW(), INTERVAL 8 DAY)),
  (2,'resolved','Corner lot cleared and swept.',4, DATE_SUB(NOW(), INTERVAL 7 DAY)),
  (3,'pending','Report submitted by resident.',6, DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (4,'pending','Report submitted by resident.',3, DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (4,'verified','Drainage crew notified.',1, DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (5,'pending','Report submitted anonymously.',5, DATE_SUB(NOW(), INTERVAL 3 DAY)),
  (5,'verified','Checked against traffic advisory.',1, DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (5,'assigned','Assigned to Rolando Bautista.',1, DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (6,'pending','Report submitted by resident.',6, DATE_SUB(NOW(), INTERVAL 21 DAY)),
  (6,'assigned','Assigned to Jose Dela Cruz.',1, DATE_SUB(NOW(), INTERVAL 20 DAY)),
  (6,'resolved','Branch cut and hauled away.',2, DATE_SUB(NOW(), INTERVAL 18 DAY)),
  (6,'closed','Resident confirmed the sidewalk is clear.',1, DATE_SUB(NOW(), INTERVAL 17 DAY));

INSERT INTO announcements (author_id, title, body, type, status, barangay, publish_at, created_at) VALUES
  (1,'Garbage collection moves to 5:00 AM starting Monday','Collection trucks will start their route an hour earlier to avoid morning traffic along McArthur Highway. Please bring your segregated waste out the night before or by 4:45 AM.','announcement','published',NULL, DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY)),
  (1,'Free anti-rabies vaccination this Saturday','Bring your dogs and cats to the Ugong covered court from 8:00 AM to 12:00 NN. Vaccination is free for two pets per household. Bring a valid ID.','event','published','Ugong', DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (1,'Water interruption on Thursday, 10 PM to 4 AM','Maynilad will repair a main line along Acacia St. Store water ahead of time. Service resumes by 4:00 AM Friday.','advisory','published','Gen. T. De Leon', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (1,'Barangay assembly agenda','Draft agenda for the quarterly assembly. Not yet final.','announcement','draft',NULL, NULL, DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (1,'Clean-up drive along the creek','Volunteers meet at the barangay hall at 6:00 AM. Gloves and sacks will be provided.','event','scheduled',NULL, DATE_ADD(NOW(), INTERVAL 5 DAY), NOW());

INSERT INTO announcement_likes (announcement_id, user_id) VALUES (1,3),(1,5),(2,3),(2,6),(3,5);

INSERT INTO announcement_comments (announcement_id, user_id, body, created_at) VALUES
  (1,3,'Thank you. Will the schedule also change on holidays?', DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (1,5,'Our street was skipped last week, hoping the earlier route fixes it.', DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (2,6,'Is there an age limit for puppies?', DATE_SUB(NOW(), INTERVAL 1 DAY));

INSERT INTO lost_found_items (user_id, type, title, description, item_date, location, contact, status, created_at) VALUES
  (3,'found','Brown leather wallet','Found near the waiting shed. Contains a company ID and some coins. Owner can describe the ID to claim.', DATE_SUB(CURDATE(), INTERVAL 3 DAY),'Waiting shed, Sampaguita St.','0917 123 4567','open', DATE_SUB(NOW(), INTERVAL 3 DAY)),
  (5,'lost','Grey tabby cat, answers to Kulot','Missing since Tuesday night. Wearing a red collar with a small bell. Very friendly, may approach strangers.', DATE_SUB(CURDATE(), INTERVAL 4 DAY),'Narra St. area','0919 223 4567','open', DATE_SUB(NOW(), INTERVAL 4 DAY)),
  (6,'found','Set of house keys with blue keychain','Four keys on a ring with a blue dolphin keychain. Left at the barangay hall front desk.', DATE_SUB(CURDATE(), INTERVAL 6 DAY),'Barangay Ugong Hall','0919 323 4567','claimed', DATE_SUB(NOW(), INTERVAL 6 DAY));

UPDATE lost_found_items SET claimed_by = 3, claimed_at = DATE_SUB(NOW(), INTERVAL 2 DAY) WHERE status = 'claimed';

INSERT INTO notifications (user_id, type, title, body, link, is_read, created_at) VALUES
  (3,'report_status','Your report is now in progress','VCRS-2026-000001 (Deep pothole near the covered court) is being worked on by the assigned crew.','/reports/1',0, DATE_SUB(NOW(), INTERVAL 3 DAY)),
  (3,'report_status','Your report was verified','VCRS-2026-000004 (Street floods after 30 minutes of rain) has been verified by the barangay.','/reports/4',0, DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (5,'report_status','Your report was resolved','VCRS-2026-000002 (Uncollected garbage at corner lot) has been marked resolved.','/reports/2',1, DATE_SUB(NOW(), INTERVAL 7 DAY)),
  (2,'assignment','New assignment','VCRS-2026-000001 has been assigned to you.','/staff/tasks',1, DATE_SUB(NOW(), INTERVAL 4 DAY)),
  (4,'assignment','New assignment','VCRS-2026-000005 has been assigned to you.','/staff/tasks',0, DATE_SUB(NOW(), INTERVAL 1 DAY));

INSERT INTO conversations (id, user_id, subject, last_message_at, created_at) VALUES
  (1, 3, 'Barangay help desk', DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY));

INSERT INTO message_items (conversation_id, sender_id, sender_type, body, is_read, created_at) VALUES
  (1, 3,    'user',      'Hello, any update on my pothole report?', 1, DATE_SUB(NOW(), INTERVAL 3 DAY)),
  (1, NULL, 'assistant', 'Your latest report VCRS-2026-000001 is in progress. Type "status" any time for the current update.', 1, DATE_SUB(NOW(), INTERVAL 3 DAY));
