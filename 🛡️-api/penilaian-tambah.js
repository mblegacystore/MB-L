// penilaian-tambah.js – Rating & ulasan
export default async function handler(req, res) {
    const { pesanan_id, pembeli_id, rating, ulasan } = req.body || {};
    if (!pesanan_id || !pembeli_id || !rating) return res.status(400).json({ error: "Data tak lengkap" });

    if (rating < 1 || rating > 5) return res.status(400).json({ error: "Rating mesti 1-5" });

    return res.status(200).json({
        success: true,
        message: "Penilaian berjaya disimpan",
        data: { pesanan_id, pembeli_id, rating, ulasan: ulasan || "" }
    });
}
