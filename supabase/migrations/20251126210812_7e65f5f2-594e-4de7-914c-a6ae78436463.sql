-- Insert 5 surveys
INSERT INTO surveys (title, description, reward_amount, time_limit_minutes, is_active, total_questions) VALUES
('Student Learning Preferences Survey', 'Help us understand how students prefer to learn', 25, 15, true, 5),
('Campus Facilities Feedback', 'Share your thoughts on campus facilities and services', 20, 10, true, 5),
('Online Learning Experience', 'Tell us about your online learning experience', 30, 20, true, 5),
('Career Aspirations Survey', 'Share your career goals and aspirations', 25, 15, true, 5),
('Mental Health & Wellbeing', 'Help us understand student mental health needs', 30, 20, true, 5);

-- Insert 25 survey questions (5 per survey)
INSERT INTO survey_questions (survey_id, question_text, question_type, options, order_index, required) 
SELECT id, 'What is your preferred learning style?', 'mcq'::question_type, '["Visual", "Auditory", "Kinesthetic", "Reading/Writing"]'::jsonb, 0, true FROM surveys WHERE title = 'Student Learning Preferences Survey'
UNION ALL
SELECT id, 'How often do you use online resources for studying?', 'mcq'::question_type, '["Daily", "Weekly", "Monthly", "Rarely"]'::jsonb, 1, true FROM surveys WHERE title = 'Student Learning Preferences Survey'
UNION ALL
SELECT id, 'Which study methods work best for you? (Select all)', 'checkbox'::question_type, '["Group study", "Solo study", "Flashcards", "Practice tests", "Video tutorials"]'::jsonb, 2, true FROM surveys WHERE title = 'Student Learning Preferences Survey'
UNION ALL
SELECT id, 'Rate your satisfaction with current teaching methods', 'rating'::question_type, '["1 - Very Dissatisfied", "2 - Dissatisfied", "3 - Neutral", "4 - Satisfied", "5 - Very Satisfied"]'::jsonb, 3, true FROM surveys WHERE title = 'Student Learning Preferences Survey'
UNION ALL
SELECT id, 'Any additional comments on learning preferences?', 'text'::question_type, null, 4, false FROM surveys WHERE title = 'Student Learning Preferences Survey'
UNION ALL
SELECT id, 'How would you rate the library facilities?', 'rating'::question_type, '["1 - Poor", "2 - Fair", "3 - Good", "4 - Very Good", "5 - Excellent"]'::jsonb, 0, true FROM surveys WHERE title = 'Campus Facilities Feedback'
UNION ALL
SELECT id, 'Which campus facilities do you use most? (Select all)', 'checkbox'::question_type, '["Library", "Computer Labs", "Cafeteria", "Sports Complex", "Study Rooms"]'::jsonb, 1, true FROM surveys WHERE title = 'Campus Facilities Feedback'
UNION ALL
SELECT id, 'How clean do you find the campus?', 'likert'::question_type, '["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]'::jsonb, 2, true FROM surveys WHERE title = 'Campus Facilities Feedback'
UNION ALL
SELECT id, 'What improvements would you suggest for campus facilities?', 'text'::question_type, null, 3, false FROM surveys WHERE title = 'Campus Facilities Feedback'
UNION ALL
SELECT id, 'Do you feel safe on campus?', 'mcq'::question_type, '["Always", "Usually", "Sometimes", "Rarely", "Never"]'::jsonb, 4, true FROM surveys WHERE title = 'Campus Facilities Feedback'
UNION ALL
SELECT id, 'How effective is online learning for you?', 'rating'::question_type, '["1 - Not Effective", "2 - Slightly Effective", "3 - Moderately Effective", "4 - Very Effective", "5 - Extremely Effective"]'::jsonb, 0, true FROM surveys WHERE title = 'Online Learning Experience'
UNION ALL
SELECT id, 'What challenges do you face with online learning? (Select all)', 'checkbox'::question_type, '["Internet connectivity", "Lack of interaction", "Technical issues", "Time management", "Motivation"]'::jsonb, 1, true FROM surveys WHERE title = 'Online Learning Experience'
UNION ALL
SELECT id, 'Do you prefer online or in-person classes?', 'mcq'::question_type, '["Strongly prefer online", "Prefer online", "No preference", "Prefer in-person", "Strongly prefer in-person"]'::jsonb, 2, true FROM surveys WHERE title = 'Online Learning Experience'
UNION ALL
SELECT id, 'Rate the quality of online course materials', 'likert'::question_type, '["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]'::jsonb, 3, true FROM surveys WHERE title = 'Online Learning Experience'
UNION ALL
SELECT id, 'Share your thoughts on improving online learning', 'text'::question_type, null, 4, false FROM surveys WHERE title = 'Online Learning Experience'
UNION ALL
SELECT id, 'What is your primary career goal after graduation?', 'mcq'::question_type, '["Employment", "Further Studies", "Entrepreneurship", "Internship", "Undecided"]'::jsonb, 0, true FROM surveys WHERE title = 'Career Aspirations Survey'
UNION ALL
SELECT id, 'Which industries interest you? (Select all)', 'checkbox'::question_type, '["Technology", "Healthcare", "Finance", "Education", "Manufacturing", "Creative Arts"]'::jsonb, 1, true FROM surveys WHERE title = 'Career Aspirations Survey'
UNION ALL
SELECT id, 'How prepared do you feel for your career?', 'rating'::question_type, '["1 - Not Prepared", "2 - Slightly Prepared", "3 - Moderately Prepared", "4 - Well Prepared", "5 - Very Well Prepared"]'::jsonb, 2, true FROM surveys WHERE title = 'Career Aspirations Survey'
UNION ALL
SELECT id, 'The university provides adequate career guidance', 'likert'::question_type, '["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]'::jsonb, 3, true FROM surveys WHERE title = 'Career Aspirations Survey'
UNION ALL
SELECT id, 'What career support services would you like to see?', 'text'::question_type, null, 4, false FROM surveys WHERE title = 'Career Aspirations Survey'
UNION ALL
SELECT id, 'How would you rate your current stress level?', 'rating'::question_type, '["1 - Very Low", "2 - Low", "3 - Moderate", "4 - High", "5 - Very High"]'::jsonb, 0, true FROM surveys WHERE title = 'Mental Health & Wellbeing'
UNION ALL
SELECT id, 'What causes you the most stress? (Select all)', 'checkbox'::question_type, '["Academic pressure", "Financial concerns", "Social relationships", "Family expectations", "Future uncertainty"]'::jsonb, 1, true FROM surveys WHERE title = 'Mental Health & Wellbeing'
UNION ALL
SELECT id, 'Do you know about the mental health services available on campus?', 'mcq'::question_type, '["Yes, and I use them", "Yes, but I don''t use them", "No", "Not sure"]'::jsonb, 2, true FROM surveys WHERE title = 'Mental Health & Wellbeing'
UNION ALL
SELECT id, 'I feel supported by the university regarding mental health', 'likert'::question_type, '["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]'::jsonb, 3, true FROM surveys WHERE title = 'Mental Health & Wellbeing'
UNION ALL
SELECT id, 'Any suggestions for improving mental health support?', 'text'::question_type, null, 4, false FROM surveys WHERE title = 'Mental Health & Wellbeing';
