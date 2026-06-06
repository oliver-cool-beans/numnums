alter table public.products
add column if not exists website_url text;

update public.products
set website_url = concat(
  'https://www.aldi.com.au/product/',
  raw_json ->> 'urlSlugText',
  '-',
  external_id
)
where source = 'aldi'
  and website_url is null
  and coalesce(raw_json ->> 'urlSlugText', '') <> '';
