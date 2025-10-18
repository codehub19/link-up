// Util for checking Instagram username validity via your deployed Cloud Function

export async function validateInstagramUsername(username: string): Promise<boolean> {
  if (!username) return false;
  // Updated with your deployed function's URL from the screenshot:
  const url = `https://checkinstagramusername-b5mtqeeitq-em.a.run.app?username=${encodeURIComponent(username)}`;
  const res = await fetch(url);
  const data = await res.json();
  return !!data.exists;
}