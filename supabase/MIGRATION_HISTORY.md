# Supabase migration history

The production database contains schema changes created during the earlier hosted/Lovable workflow. Their migration versions are now recorded in the remote migration history alongside the repository migration versions so Supabase CI can recognize the production schema as already migrated.

Do not delete or rewrite entries in `supabase_migrations.schema_migrations`. For future schema changes, add a new timestamped migration under `supabase/migrations/`, verify it against Supabase, and merge only after Build and security checks pass.
