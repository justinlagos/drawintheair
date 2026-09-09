-- WP1A.2 staging sync 06: app-owned signup triggers on auth.users (present in prod, absent in staging). Definitions from prod pg_get_triggerdef.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_parent ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_teacher ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE TRIGGER on_auth_user_created_parent AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_parent_user();
CREATE TRIGGER on_auth_user_created_teacher AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_teacher_user();
