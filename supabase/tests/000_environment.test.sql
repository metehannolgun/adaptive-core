begin;

create extension if not exists pgtap with schema extensions;

select plan(2);

select ok(
  current_setting('server_version_num')::integer >= 150000,
  'PostgreSQL 15 or newer is running'
);

select has_extension(
  'pgtap',
  'pgTAP is available for database security tests'
);

select * from finish();

rollback;
