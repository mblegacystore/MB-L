async function doLogin() {
    updateStatus("Menyambung...");
    try {
        const auth = await Pi.authenticate(["username", "payments", "wallet_address"]);
        
        // ✅ PASTIKAN UID DISIMPAN DENGAN BETUL
        currentUser = {
            uid: auth.user.uid,
            username: auth.user.username,
            wallet_address: auth.user.wallet_address || ""
        };
        
        // ✅ SIMPAN KE localStorage (PENTING!)
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Pulihkan status pembelian
        if (localStorage.getItem('mb-legacy-bought-echelon') === 'true') currentUser.boughtEchelon = true;
        if (localStorage.getItem('mb-legacy-bought-command') === 'true') currentUser.boughtCommand = true;
        
        updateStatus(currentUser.username);
        document.getElementById("btn-login").style.display = "none";
        tryEnablePaymentButtons();
        
        // ✅ DEBUG: ALERT UNTUK PASTIKAN
        alert("Login berjaya! UID disimpan: " + currentUser.uid);
        
    } catch (e) {
        updateStatus("Login gagal: " + e.message);
        alert("Login error: " + e.message);
    }
}

// ✅ RESTORE SESSION (guna untuk welcome back)
const saved = localStorage.getItem('currentUser');
if (saved) {
    try {
        currentUser = JSON.parse(saved);
        updateStatus("Welcome back: " + currentUser.username);
        document.getElementById("btn-login").style.display = "none";
        tryEnablePaymentButtons();
    } catch (e) {}
}
