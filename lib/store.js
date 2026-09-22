const { supabase } = require("./supabase");

function fromRow(row) {
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    network: row.network,
    format: row.format,
    theme: row.theme,
    caption: row.caption,
    hashtags: row.hashtags,
    notes: row.notes,
    images: row.images || [],
    status: row.status,
    createdAt: row.created_at,
    sourceSessionId: row.source_session_id,
    instagramMediaId: row.instagram_media_id,
  };
}

function toRow(post) {
  return {
    id: post.id,
    date: post.date || "",
    time: post.time || "",
    network: post.network || "",
    format: post.format || "",
    theme: post.theme || "",
    caption: post.caption || "",
    hashtags: post.hashtags || "",
    notes: post.notes || "",
    images: post.images || [],
    status: post.status || "pendente",
    created_at: post.createdAt || new Date().toISOString(),
    source_session_id: post.sourceSessionId || null,
    instagram_media_id: post.instagramMediaId || null,
  };
}

async function listPosts() {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("date", { ascending: false })
    .order("time", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(fromRow);
}

async function getPost(id) {
  const { data, error } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromRow(data) : null;
}

async function savePost(post) {
  const row = toRow(post);
  const { error } = await supabase.from("posts").upsert(row);
  if (error) throw new Error(error.message);
  return post;
}

async function deletePost(id) {
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

async function hasSynced(sessionId) {
  const { data, error } = await supabase
    .from("synced_sessions")
    .select("session_id")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return !!data;
}

async function markSynced(sessionId) {
  const { error } = await supabase.from("synced_sessions").upsert({ session_id: sessionId });
  if (error) throw new Error(error.message);
}

async function getLatestWeek() {
  const { data, error } = await supabase
    .from("weeks")
    .select("*")
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    weekStart: data.week_start,
    days: data.days || [],
    sourceSessionId: data.source_session_id,
    syncedAt: data.synced_at,
  };
}

async function saveWeek(week) {
  const { error } = await supabase.from("weeks").upsert({
    week_start: week.weekStart,
    days: week.days,
    source_session_id: week.sourceSessionId || null,
    synced_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

module.exports = { listPosts, getPost, savePost, deletePost, hasSynced, markSynced, getLatestWeek, saveWeek };
