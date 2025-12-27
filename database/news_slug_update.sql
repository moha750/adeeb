ALTER TABLE news
ADD COLUMN IF NOT EXISTS slug TEXT;

UPDATE news
SET slug = (
  CASE
    WHEN COALESCE(TRIM(title), '') <> '' THEN
      regexp_replace(
        regexp_replace(
          regexp_replace(TRIM(title), '\\s+', '-', 'g'),
          '[\\/\\?\\#\\&\\%]+',
          '',
          'g'
        ),
        '-+',
        '-',
        'g'
      ) || '-' || substr(replace(id::text, '-', ''), 1, 8)
    ELSE
      'news-' || substr(replace(id::text, '-', ''), 1, 8)
  END
)
WHERE slug IS NULL OR slug = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_news_slug_unique
ON news (slug)
WHERE slug IS NOT NULL;

CREATE OR REPLACE FUNCTION set_news_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := regexp_replace(
      regexp_replace(
        regexp_replace(TRIM(COALESCE(NEW.title, '')), '\\s+', '-', 'g'),
        '[\\/\\?\\#\\&\\%]+',
        '',
        'g'
      ),
      '-+',
      '-',
      'g'
    );

    IF NEW.slug IS NULL OR NEW.slug = '' THEN
      NEW.slug := 'news';
    END IF;

    NEW.slug := NEW.slug || '-' || substr(replace(NEW.id::text, '-', ''), 1, 8);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_news_slug ON news;
CREATE TRIGGER trg_set_news_slug
BEFORE INSERT ON news
FOR EACH ROW
EXECUTE FUNCTION set_news_slug();
