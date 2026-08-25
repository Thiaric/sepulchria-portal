-- Forum section classification fix
--
-- "organisation" is a forum classification only:
-- anything organisational that is neither Ongame nor Offgame.
--
-- An Organisation section does NOT need an Association or Order.
-- association_id and order_id remain optional relationships.
--
-- The old check constraint incorrectly coupled section_type='organisation'
-- to association_id and blocks otherwise valid forum sections.

alter table public.forum_sections
  drop constraint if exists forum_sections_association_check;

-- Keep the existing foreign keys on association_id/order_id.
-- No replacement CHECK is required: NULL is valid for both optional links.
