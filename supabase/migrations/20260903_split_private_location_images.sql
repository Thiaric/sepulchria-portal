-- Split Private Location / Order Headquarters listing image from chat background.
-- Existing rooms.image_url remains the Location Image.
-- background_image_url starts NULL so the two concepts are genuinely separate.

alter table public.rooms
add column if not exists background_image_url text;
