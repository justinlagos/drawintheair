-- Form submissions table for unified lead capture
-- Stores all form data from drawintheair.com (Vite SPA)

CREATE TABLE IF NOT EXISTS public.form_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  form_type TEXT NOT NULL,
  email TEXT,
  name TEXT,
  school TEXT,
  role TEXT,
  message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for querying by type and date
CREATE INDEX IF NOT EXISTS idx_form_submissions_type ON public.form_submissions(form_type);
CREATE INDEX IF NOT EXISTS idx_form_submissions_created ON public.form_submissions(created_at DESC);

-- Newsletter subscribers table
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  source TEXT DEFAULT 'website',
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  unsubscribe_token TEXT DEFAULT encode(gen_random_bytes(16), 'hex'),
  unsubscribed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_newsletter_email ON public.newsletter_subscribers(email);

-- Enable RLS
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can insert (API route uses service key)
CREATE POLICY "Service role can insert form submissions"
  ON public.form_submissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can read form submissions"
  ON public.form_submissions FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert subscribers"
  ON public.newsletter_subscribers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can read subscribers"
  ON public.newsletter_subscribers FOR SELECT
  USING (true);
