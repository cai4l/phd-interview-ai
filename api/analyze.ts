import { supabase } from "../lib/supabase";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).end("Method Not Allowed");
  }

  const { prompt, userHash } = req.body;

  if (!prompt || !userHash) {
    return res.status(400).json({ error: "缺少参数" });
  }

  // 查询用户剩余次数
  let { data: user } = await supabase
    .from("users_quota")
    .select("*")
    .eq("user_hash", userHash)
    .single();

  // 用户不存在就创建
  if (!user) {
    const insert = await supabase
      .from("users_quota")
      .insert({ user_hash: userHash, remaining: 5 })
      .select()
      .single();
    user = insert.data;
  }

  if (!user) {
    return res.status(500).json({ error: "用户初始化失败" });
  }

  if (user.remaining <= 0) {
    return res.status(403).json({ error: "次数已用完", remaining: 0 });
  }

  // 调用 DeepSeek API
  let result = "DeepSeek 返回格式异常";
  try {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
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

    const data: any = await response.json();
    result = data.choices?.[0]?.message?.content ?? result;
  } catch (err) {
    console.error("DeepSeek API 调用失败", err);
  }

  // 扣减剩余次数
  const { error } = await supabase
    .from("users_quota")
    .update({ remaining: user.remaining - 1 })
    .eq("user_hash", userHash);

  if (error) {
    console.error("更新用户次数失败", error);
  }

  res.status(200).json({
    result,
    remaining: user.remaining - 1,
  });
}
