module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const handle = String(req.query.query || '').trim().replace(/^@/, '').replace(/^https?:\/\/(?:www\.)?tiktok\.com\/@/i, '').split(/[/?#]/)[0];
  if (!/^[a-zA-Z0-9._]{2,24}$/.test(handle)) return res.status(400).json({ error: 'Enter a valid TikTok username' });
  const key = process.env.SCRAPECREATORS_API_KEY || req.headers['x-api-key'];
  if (!key) return res.status(400).json({ error: 'ScrapeCreators API key is missing' });
  try {
    const upstream = await fetch('https://api.scrapecreators.com/v1/tiktok/profile?handle=' + encodeURIComponent(handle), {
      headers: { 'x-api-key': key, accept: 'application/json' }
    });
    const data = await upstream.json();
    if (!upstream.ok || data.success === false) {
      const message = data.error || data.message || (upstream.status === 404 ? 'TikTok account not found' : 'ScrapeCreators request failed');
      return res.status(upstream.ok ? 502 : upstream.status).json({ error: String(message) });
    }
    const user = data.user || data.userInfo?.user || data.userInfo || data.data?.user;
    if (!user?.uniqueId && !user?.unique_id) return res.status(404).json({ error: 'TikTok account not found' });
    if ((user.uniqueId || user.unique_id).toLowerCase() !== handle.toLowerCase()) {
      return res.status(502).json({ error: 'Returned account does not match the username' });
    }
    return res.status(200).json({ user: {
      username: user.uniqueId || user.unique_id,
      nickname: user.nickname || user.nickName || user.uniqueId || user.unique_id,
      avatar: user.avatarThumb || user.avatarMedium || user.avatarLarger || user.avatar_168x168?.url_list?.[0] || ''
    } });
  } catch (_) { return res.status(502).json({ error: 'Could not reach ScrapeCreators' }); }
};
