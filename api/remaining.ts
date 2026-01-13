import { supabase } from "../lib/supabase";

export default async function handler(req, res) {
  const userHash = req.query.userHash;

  if (!userHash) {
    return res.status(400).json({ error: "缺少 userHash" });
  }

  let { data } = await supabase
    .from("users_quota")
    .select("*")
    .eq("user_hash", userHash)
    .single();

  if (!data) {
    const insert = await supabase
      .from("users_quota")
      .insert({ user_hash: userHash })
      .select()
      .single();
    data = insert.data;
  }

  res.json({ remaining: data.remaining });
}
