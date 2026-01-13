import { supabase } from "../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end("Method Not Allowed");
  }

  const { prompt, userHash } = req.body;

  if (!prompt || !userHash) {
    return res.status(400).json({ error: "缺少参数" });
  }

  let { data: user } = await supabase
    .from("users_quota")
    .select("*")
    .eq("user_hash", userHash)
    .single();

  if (!user) {
    const insert = await supabase
      .from("users_quota")
      .insert({ user_hash: userHash })
      .select()
      .single();
    user = insert.data;
  }

  if (user.remaining <= 0) {
    return res.status(403).json({ error: "次数已用完", remaining: 0 });
  }

  const dsRes = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const dsData = await dsRes.json();
  const result = dsData.choices?.[0]?.message?.content ?? "分析失败";

  await supabase
    .from("users_quota")
    .update({ remaining: user.remaining - 1 })
    .eq("user_hash", userHash);

  res.json({
    result,
    remaining: user.remaining - 1,
  });
}
