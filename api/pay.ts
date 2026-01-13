import { supabase } from "../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { userHash } = req.body;

  if (!userHash) {
    return res.status(400).json({ error: "缺少 userHash" });
  }

  const { data } = await supabase
    .from("users_quota")
    .select("remaining")
    .eq("user_hash", userHash)
    .single();

  const current = data?.remaining ?? 0;

  await supabase
    .from("users_quota")
    .update({ remaining: current + 5 })
    .eq("user_hash", userHash);

  res.json({
    success: true,
    remaining: current + 5,
  });
}
