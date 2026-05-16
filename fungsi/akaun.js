let currentUser = null;

async function doLogin() {
    updateStatus("Menyambung...");
    try {
        const auth = await Pi.authenticate(["username", "payments", "wallet_address"]);
        currentUser = {
            uid: auth.uid,
            username: auth.username,
            wallet_address: auth.wallet_address || ""
        };
        
        // Simpan ke localStorage untuk survival refresh
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Pulihkan status pembelian
        if (localStorage.getItem('mb-legacy-bought-echelon') === 'true') currentUser.boughtEchelon = true;
        if (localStorage.getItem('mb-legacy-bought-command') === 'true') currentUser.boughtCommand = true;
        
        updateStatus(currentUser.username);
        document.getElementById("btn-login").style.display = "none";
        tryEnablePaymentButtons();
    } catch (e) {
        updateStatus("Login gagal: " + e.message);
    }
}

// ========== RESTORE SESSION SELEPAS REFRESH ==========
const saved = localStorage.getItem('currentUser');
if (saved) {
    try {
        currentUser = JSON.parse(saved);
        updateStatus("Welcome back: " + currentUser.username);
        document.getElementById("btn-login").style.display = "none";
        tryEnablePaymentButtons();
    } catch (e) {}
}
