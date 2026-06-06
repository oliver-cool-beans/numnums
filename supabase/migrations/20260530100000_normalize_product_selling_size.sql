update public.products
set brand = lower(trim(brand))
where brand is not null;

update public.products
set selling_unit = substring(
  lower(selling_size)
  from '[0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?\s*(kg|g|mg|l|ml)\b'
)
where selling_size is not null
  and pg_typeof(selling_size) = 'text'::regtype;

alter table public.products
alter column selling_size type numeric
using (
  case
    when selling_size is null then null
    when substring(
      lower(selling_size)
      from '([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)\s*(?:kg|g|mg|l|ml)\b'
    ) is null then null
    else replace(
      substring(
        lower(selling_size)
        from '([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)\s*(?:kg|g|mg|l|ml)\b'
      ),
      ',',
      ''
    )::numeric
  end
);
