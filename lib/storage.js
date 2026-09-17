const { supabase } = require("./supabase");

async function uploadImage(buffer, filename, contentType) {
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${filename}`;
  const { error } = await supabase.storage.from("images").upload(path, buffer, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("images").getPublicUrl(path);
  return data.publicUrl;
}

module.exports = { uploadImage };
