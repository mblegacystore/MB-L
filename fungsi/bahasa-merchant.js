// ============================================================
// bahasa-merchant.js – Dwi Bahasa untuk Dashboard Penjual & Pembeli
// ============================================================

// 1. Objek terjemahan (English / Melayu)
const DASH_LANG = {
    ms: {
        // Penjual
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
        // Pembeli
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
        // AMARAN (Sama seperti halaman utama)
        amaran: "NOTIS KESELAMATAN: MB Legacy Store TIDAK AKAN PERNAH meminta frasa laluan dompet anda."
    },
    en: {
        // Penjual
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
        // Pembeli
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
        // AMARAN (Sama seperti halaman utama)
        amaran: "SECURITY NOTICE: MB Legacy Store will NEVER ask for your wallet passphrase."
    }
};

// 2. Fungsi untuk menukar teks elemen
function setText(id, teks) {
    var el = document.getElementById(id);
    if (el) {
        el.textContent = teks;
        return true;
    }
    return false;
}

// 3. Fungsi utama untuk kemaskini semua teks
function applyDashboardLanguage() {
    var lang = localStorage.getItem('mb-legacy-lang') || 'en';
    var t = DASH_LANG[lang] || DASH_LANG.en;

    // Penjual
    setText('dp-tajuk', t.penjual_tajuk);
    setText('dp-sub', t.penjual_sub);
    setText('dp-tmbh', t.penjual_tmbh);
    setText('dp-tmbh-desc', t.penjual_tmbh_desc);
    setText('dp-produk', t.penjual_produk);
    setText('dp-produk-desc', t.penjual_produk_desc);
    setText('dp-pesanan', t.penjual_pesanan);
    setText('dp-pesanan-desc', t.penjual_pesanan_desc);
    setText('dp-pendapatan', t.penjual_pendapatan);
    setText('dp-pendapatan-desc', t.penjual_pendapatan_desc);
    setText('dp-aduan', t.penjual_aduan);
    setText('dp-aduan-desc', t.penjual_aduan_desc);
    setText('dp-kembali', t.penjual_kembali);

    // Pembeli
    setText('db-tajuk', t.pembeli_tajuk);
    setText('db-sub', t.pembeli_sub);
    setText('db-sejarah', t.pembeli_sejarah);
    setText('db-sejarah-desc', t.pembeli_sejarah_desc);
    setText('db-sejarah-kosong', t.pembeli_sejarah_kosong);
    setText('db-status', t.pembeli_status);
    setText('db-status-desc', t.pembeli_status_desc);
    setText('db-status-kosong', t.pembeli_status_kosong);
    setText('db-aduan', t.pembeli_aduan);
    setText('db-aduan-desc', t.pembeli_aduan_desc);
    setText('db-penilaian', t.pembeli_penilaian);
    setText('db-penilaian-desc', t.pembeli_penilaian_desc);
    setText('db-kembali', t.pembeli_kembali);

    // AMARAN (Tambah ini untuk pastikan ia berfungsi)
    // Cuba set ID yang mungkin anda gunakan:
    var success = setText('dash-amaran', t.amaran);   // Jika HTML guna id="dash-amaran"
    if (!success) {
        setText('security-text', t.amaran);          // Jika HTML guna id="security-text"
    }
}

// 4. Fungsi untuk tukar bahasa (boleh panggil dari HTML)
window.switchDashboardLanguage = function(lang) {
    if (lang === 'ms' || lang === 'en') {
        localStorage.setItem('mb-legacy-lang', lang);
        applyDashboardLanguage();
        
        // Kemaskini butang aktif
        var buttons = document.querySelectorAll('.lang-selector button');
        buttons.forEach(function(b) { b.classList.remove('active'); });
        var activeBtn = document.querySelector('.lang-selector button[onclick*="' + lang + '"]');
        if (activeBtn) activeBtn.classList.add('active');
    }
};

// 5. Jalankan semasa halaman dimuat
document.addEventListener('DOMContentLoaded', function() {
    var savedLang = localStorage.getItem('mb-legacy-lang') || 'en';
    applyDashboardLanguage();
    
    // Kemaskini butang aktif
    var buttons = document.querySelectorAll('.lang-selector button');
    buttons.forEach(function(b) { b.classList.remove('active'); });
    var activeBtn = document.querySelector('.lang-selector button[onclick*="' + savedLang + '"]');
    if (activeBtn) activeBtn.classList.add('active');
});
