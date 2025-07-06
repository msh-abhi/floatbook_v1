ALTER TABLE public.bookings
ADD COLUMN guest_count integer NOT NULL DEFAULT 1,
ADD COLUMN booking_type text NOT NULL DEFAULT 'individual';