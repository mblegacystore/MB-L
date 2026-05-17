async function doLogin() {
    updateStatus("Menyambung...");
    try {
        const auth = await Pi.authenticate(["username", "payments", "wallet_address"]);
        
        currentUser = {
            uid: auth.user.uid,
            username: auth.user.username,
            wallet_address: auth.user.wallet_address || ""
        };
        
        // Simpan ke localStorage bersama timestamp
        const userData = {
            ...currentUser,
            timestamp: Date.now()
        };
        localStorage.setItem('currentUser', JSON.stringify(userData));
        
        if (localStorage.getItem('mb-legacy-bought-echelon') === 'true') currentUser.boughtEchelon = true;
        if (localStorage.getItem('mb-legacy-bought-command') === 'true') currentUser.boughtCommand = true;
        
        updateStatus(currentUser.username);
        document.getElementById("btn-login").style.display = "none";
        tryEnablePaymentButtons();
        
    } catch (e) {
        updateStatus("Login gagal: " + e.message);
    }
}

// ✅ RESTORE SESSION DENGAN VALIDASI
async function restoreSession() {
    const saved = localStorage.getItem('currentUser');
    if (!saved) return;
    
    try {
        const userData = JSON.parse(saved);
        const now = Date.now();
        
        // Jika sesi lebih dari 5 minit, login semula
        if (now - (userData.timestamp || 0) > 300000) { // 5 minit
            console.log("Session expired, re-authenticating...");
            await doLogin();
            return;
        }
        
        currentUser = {
            uid: userData.uid,
            username: userData.username,
            wallet_address: userData.wallet_address || ""
        };
        
        updateStatus("Welcome back: " + currentUser.username);
        document.getElementById("btn-login").style.display = "none";
        tryEnablePaymentButtons();
        
    } catch (e) {
        console.error("Restore error:", e);
    }
}

// Panggil restoreSession semasa load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreSession);
} else {
    restoreSession();
}
