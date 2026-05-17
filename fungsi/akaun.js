// Pembolehubah Global (Pastikan ini selaras dengan kod anda yang lain)
let currentUser = null;

/**
 * Fungsi Utama untuk Log Masuk (Autentikasi)
 * @param {boolean} isSilent - Jika true, ia akan berjalan di belakang tabir tanpa mengubah UI status log masuk
 */
async function doLogin(isSilent = false) {
    // Hanya tunjuk tulisan "Menyambung..." jika ini adalah login manual (klik butang)
    if (!isSilent) updateStatus("Menyambung...");
    
    try {
        // Sentiasa panggil Pi.authenticate untuk menyegarkan token sesi aktif di server Pi Network
        const auth = await Pi.authenticate(["username", "payments", "wallet_address"]);
        
        currentUser = {
            uid: auth.user.uid,
            username: auth.user.username,
            wallet_address: auth.user.wallet_address || ""
        };
        
        // Simpan ke localStorage bersama timestamp segar
        const userData = {
            ...currentUser,
            timestamp: Date.now()
        };
        localStorage.setItem('currentUser', JSON.stringify(userData));
        
        // Semakan produk simpanan tempatan anda (MBL Store Logik)
        if (localStorage.getItem('mb-legacy-bought-echelon') === 'true') currentUser.boughtEchelon = true;
        if (localStorage.getItem('mb-legacy-bought-command') === 'true') currentUser.boughtCommand = true;
        
        // Kemaskini UI
        updateStatus(currentUser.username);
        document.getElementById("btn-login").style.display = "none";
        tryEnablePaymentButtons();
        
        console.log("Sesi Pi Network berjaya diaktifkan semula untuk UID:", currentUser.uid);
        
    } catch (e) {
        console.error("Autentikasi Pi Gagal:", e);
        
        if (!isSilent) {
            updateStatus("Login gagal: " + e.message);
        } else {
            // Jika auto-refresh di belakang tabir gagal (contoh: sesi mati terus/expired),
            // paparkan semula butang login asal untuk paksa user klik manual
            document.getElementById("btn-login").style.display = "block";
            updateStatus("Sila login semula");
        }
    }
}

/**
 * Memulihkan Sesi Lama (Restore Session) 
 * Logik Diperbaharu: UI dimuatkan pantas menggunakan Storage, manakala token sesi disahkan secara senyap
 */
async function restoreSession() {
    const saved = localStorage.getItem('currentUser');
    if (!saved) return; // Jika tiada data disimpan, biar user klik butang login manual
    
    try {
        const userData = JSON.parse(saved);
        
        // LANGKAH 1: Muatkan UI dengan data sedia ada serta-merta (UX yang pantas)
        currentUser = {
            uid: userData.uid,
            username: userData.username,
            wallet_address: userData.wallet_address || ""
        };
        
        updateStatus("Welcome back: " + currentUser.username);
        document.getElementById("btn-login").style.display = "none";
        tryEnablePaymentButtons();
        
        // LANGKAH 2: Segarkan sambungan sesi dengan Pi Server secara senyap (Silent Refresh)
        // Langkah ini amat penting bagi mengelakkan ralat A2U "user not found" di Vercel Backend
        console.log("Menyegarkan sesi aktif dengan pelayan Pi Network...");
        await doLogin(true); 
        
    } catch (e) {
        console.error("Gagal memulihkan sesi dari storage:", e);
    }
}

// Pemicu Automatik Apabila Aplikasi Dimuatkan (DOM Load Trigger)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreSession);
} else {
    restoreSession();
}
