// 📦-produk-tambah.js – Penjual tambah produk
export default async function handler(req, res) {
    const { nama, harga, stok, penjual_id } = req.body || {};
    if (!nama || !harga || !penjual_id) return res.status(400).json({ error: "Data tak lengkap" });

    return res.status(200).json({
        success: true,
        message: "Produk berjaya ditambah",
        data: { nama, harga, stok: stok || 1, penjual_id }
    });
}
