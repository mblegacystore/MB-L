let currentUser = null;

async function doLogin() {
    updateStatus("Menyambung...");
    try {
        const auth = await Pi.authenticate(["username", "payments", "wallet_address"]);
        
        // ✅ HANYA PERUBAHAN: guna auth.user.uid (bukan auth.uid)
        currentUser = {
            uid: auth.user.uid,                    // ← UID HASH untuk A2U
            username: auth.user.username,
            wallet_address: auth.user.wallet_address || ""
        };
        
        // 🔥 PULIHKAN STATUS PEMBELIAN DARI localStorage
        if (localStorage.getItem('mb-legacy-bought-echelon') === 'true') currentUser.boughtEchelon = true;
        if (localStorage.getItem('mb-legacy-bought-command') === 'true') currentUser.boughtCommand = true;
        
        updateStatus(currentUser.username);
        document.getElementById("btn-login").style.display = "none";
        tryEnablePaymentButtons();
    } catch (e) {
        updateStatus("Login gagal: " + e.message);
    }
}

// RESTORE SESSION (KEKAL ASAL)
const saved = localStorage.getItem('currentUser');
if (saved) {
    try {
        currentUser = JSON.parse(saved);
        updateStatus("Welcome back: " + currentUser.username);
        document.getElementById("btn-login").style.display = "none";
        tryEnablePaymentButtons();
    } catch (e) {}
}
