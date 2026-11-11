-- Lower 80% bound of each day's estimate (evidence for title-equivalent milestones, measurement model section 7).
ALTER TABLE daily ADD COLUMN low80 REAL;
