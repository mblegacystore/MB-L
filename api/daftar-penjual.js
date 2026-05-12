export default async function handler(req, res) {
    const { username, wallet_address, nama_kedai } = req.body || {};
    if (!username || !wallet_address || !nama_kedai) return res.status(400).json({ error: "Data tak lengkap" });

    return res.status(200).json({
        success: true,
        message: "Penjual berjaya didaftarkan",
        data: { username, wallet_address, nama_kedai, status: "aktif" }
    });
}
