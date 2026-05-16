async function doLogin() {
    updateStatus("Menyambung...");
    try {
        const auth = await Pi.authenticate(["username", "payments", "wallet_address"]);
        currentUser = {
            uid: auth.uid,                           // ← BETUL: auth.uid
            username: auth.username,                 // ← BETUL: auth.username
            wallet_address: auth.wallet_address || "" // ← BETUL: auth.wallet_address
        };
        
        // 🔥 PULIHKAN STATUS PEMBELIAN DARI localStorage (2 baris)
        if (localStorage.getItem('mb-legacy-bought-echelon') === 'true') currentUser.boughtEchelon = true;
        if (localStorage.getItem('mb-legacy-bought-command') === 'true') currentUser.boughtCommand = true;
        
        updateStatus(currentUser.username);
        document.getElementById("btn-login").style.display = "none";
        tryEnablePaymentButtons();
    } catch (e) {
        updateStatus("Login gagal: " + e.message);
    }
}
