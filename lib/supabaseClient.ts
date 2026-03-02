import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://oiqoddjyrswrniluxxlz.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "e_QK4n7Hy2mFeHUp8cmj-Riw_Vghpbrxg";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);