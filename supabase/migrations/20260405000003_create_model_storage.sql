-- Create a storage bucket for model artifacts
INSERT INTO storage.buckets (id, name, public)
VALUES ('models', 'models', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated and service role to read/write
CREATE POLICY "Service role can manage models"
ON storage.objects FOR ALL
USING (bucket_id = 'models')
WITH CHECK (bucket_id = 'models');
