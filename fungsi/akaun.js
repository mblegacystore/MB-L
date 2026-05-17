async function doLogin() {
    updateStatus("Menyambung...");
    try {
        const auth = await Pi.authenticate(["username", "payments", "wallet_address"]);
        
        // Simpan semua kemungkinan UID
        currentUser = {
            uid1: auth.user.uid,
            uid2: auth.uid,
            uid3: auth.user.id,
            username: auth.user.username,
            wallet_address: auth.user.wallet_address || ""
        };
        
        if (localStorage.getItem('mb-legacy-bought-echelon') === 'true') currentUser.boughtEchelon = true;
        if (localStorage.getItem('mb-legacy-bought-command') === 'true') currentUser.boughtCommand = true;
        
        updateStatus(currentUser.username);
        document.getElementById("btn-login").style.display = "none";
        tryEnablePaymentButtons();
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Alert untuk tunjuk semua UID
        alert("UID1 (auth.user.uid): " + currentUser.uid1 + "\nUID2 (auth.uid): " + currentUser.uid2 + "\nUID3 (auth.user.id): " + currentUser.uid3);
        
    } catch (e) {
        updateStatus("Login gagal: " + e.message);
    }
}

const saved = localStorage.getItem('currentUser');
if (saved) {
    try {
        currentUser = JSON.parse(saved);
        updateStatus("Welcome back: " + currentUser.username);
        document.getElementById("btn-login").style.display = "none";
        tryEnablePaymentButtons();
    } catch (e) {}
}
