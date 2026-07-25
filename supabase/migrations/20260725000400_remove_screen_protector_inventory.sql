drop table if exists
  public.primitive_repairs_screen_protector_movements
cascade;

drop table if exists
  public.primitive_repairs_screen_protector_inventory_audit
cascade;

drop table if exists
  public.primitive_repairs_screen_protector_audit
cascade;

drop table if exists
  public.primitive_repairs_screen_protectors
cascade;

do $$
declare
  function_record record;
begin
  for function_record in
    select
      procedure.oid::regprocedure::text as signature
    from pg_proc as procedure
    join pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname like
        'primitive_repairs%screen_protector%'
  loop
    execute
      'drop function if exists ' ||
      function_record.signature ||
      ' cascade';
  end loop;
end;
$$;