// bahasa-dashboard.js – Terjemahan untuk Dashboard Penjual & Pembeli
const DASH_LANG = {
    ms: {
        penjual_tajuk: "DASHBOARD PENJUAL",
        penjual_sub: "Urus Kedai Anda",
        penjual_tmbh: "📦 Tambah Produk Baru",
        penjual_tmbh_desc: "Senaraikan produk baharu untuk dijual di MB LEGACY STORE.",
        penjual_produk: "📋 Produk Saya",
        penjual_produk_desc: "Lihat dan urus semua produk yang telah anda senaraikan.",
        penjual_pesanan: "🛒 Pesanan Diterima",
        penjual_pesanan_desc: "Lihat dan proses pesanan daripada pelanggan.",
        penjual_pendapatan: "💰 Pendapatan",
        penjual_pendapatan_desc: "Lihat jumlah Pi yang telah anda terima.",
        penjual_aduan: "🚨 Aduan Pelanggan",
        penjual_aduan_desc: "Lihat dan balas aduan daripada pelanggan.",
        penjual_kembali: "⬅ KEMBALI KE KEDAI",
        pembeli_tajuk: "DASHBOARD PEMBELI",
        pembeli_sub: "Sejarah & Status Pesanan Anda",
        pembeli_sejarah: "📜 Sejarah Pembelian",
        pembeli_sejarah_desc: "Lihat semua produk yang telah anda beli.",
        pembeli_sejarah_kosong: "0 Pembelian",
        pembeli_status: "📦 Status Pesanan",
        pembeli_status_desc: "Semak status penghantaran pesanan anda.",
        pembeli_status_kosong: "Tiada Pesanan Aktif",
        pembeli_aduan: "🚨 Buka Aduan",
        pembeli_aduan_desc: "Laporkan masalah dengan pesanan anda.",
        pembeli_penilaian: "⭐ Beri Penilaian",
        pembeli_penilaian_desc: "Nilai produk yang telah anda terima.",
        pembeli_kembali: "⬅ KEMBALI KE KEDAI",
        amaran: "MB LEGACY STORE TIDAK AKAN PERNAH MEMINTA FRASA LALUAN WALLET ANDA!"
    },
    en: {
        penjual_tajuk: "SELLER DASHBOARD",
        penjual_sub: "Manage Your Store",
        penjual_tmbh: "📦 Add New Product",
        penjual_tmbh_desc: "List new products for sale on MB LEGACY STORE.",
        penjual_produk: "📋 My Products",
        penjual_produk_desc: "View and manage all your listed products.",
        penjual_pesanan: "🛒 Orders Received",
        penjual_pesanan_desc: "View and process customer orders.",
        penjual_pendapatan: "💰 Earnings",
        penjual_pendapatan_desc: "View the amount of Pi you have received.",
        penjual_aduan: "🚨 Customer Complaints",
        penjual_aduan_desc: "View and respond to customer complaints.",
        penjual_kembali: "⬅ BACK TO STORE",
        pembeli_tajuk: "BUYER DASHBOARD",
        pembeli_sub: "Your Order History & Status",
        pembeli_sejarah: "📜 Purchase History",
        pembeli_sejarah_desc: "View all products you have purchased.",
        pembeli_sejarah_kosong: "0 Purchases",
        pembeli_status: "📦 Order Status",
        pembeli_status_desc: "Check the shipping status of your orders.",
        pembeli_status_kosong: "No Active Orders",
        pembeli_aduan: "🚨 Open Dispute",
        pembeli_aduan_desc: "Report a problem with your order.",
        pembeli_penilaian: "⭐ Give Rating",
        pembeli_penilaian_desc: "Rate the products you have received.",
        pembeli_kembali: "⬅ BACK TO STORE",
        amaran: "MB LEGACY STORE WILL NEVER ASK FOR YOUR WALLET PASSPHRASE!"
    }
};

function setDashText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
}

function applyDashboardLanguage() {
    var lang = localStorage.getItem('mb-legacy-lang') || 'en';
    var t = DASH_LANG[lang] || DASH_LANG.en;

    // Penjual
    setDashText('dp-tajuk', t.penjual_tajuk);
    setDashText('dp-sub', t.penjual_sub);
    setDashText('dp-tmbh', t.penjual_tmbh);
    setDashText('dp-tmbh-desc', t.penjual_tmbh_desc);
    setDashText('dp-produk', t.penjual_produk);
    setDashText('dp-produk-desc', t.penjual_produk_desc);
    setDashText('dp-pesanan', t.penjual_pesanan);
    setDashText('dp-pesanan-desc', t.penjual_pesanan_desc);
    setDashText('dp-pendapatan', t.penjual_pendapatan);
    setDashText('dp-pendapatan-desc', t.penjual_pendapatan_desc);
    setDashText('dp-aduan', t.penjual_aduan);
    setDashText('dp-aduan-desc', t.penjual_aduan_desc);
    setDashText('dp-kembali', t.penjual_kembali);

    // Pembeli
    setDashText('db-tajuk', t.pembeli_tajuk);
    setDashText('db-sub', t.pembeli_sub);
    setDashText('db-sejarah', t.pembeli_sejarah);
    setDashText('db-sejarah-desc', t.pembeli_sejarah_desc);
    setDashText('db-sejarah-kosong', t.pembeli_sejarah_kosong);
    setDashText('db-status', t.pembeli_status);
    setDashText('db-status-desc', t.pembeli_status_desc);
    setDashText('db-status-kosong', t.pembeli_status_kosong);
    setDashText('db-aduan', t.pembeli_aduan);
    setDashText('db-aduan-desc', t.pembeli_aduan_desc);
    setDashText('db-penilaian', t.pembeli_penilaian);
    setDashText('db-penilaian-desc', t.pembeli_penilaian_desc);
    setDashText('db-kembali', t.pembeli_kembali);

    // Amaran
    setDashText('dash-amaran', t.amaran);
}

document.addEventListener('DOMContentLoaded', applyDashboardLanguage);
