// 🔐-akaun.js – Login & daftar
async function doLogin() {
    updateStatus("🔄 Menyambung...");
    try {
        const auth = await Pi.authenticate(["username", "payments", "wallet_address"]);
        currentUser = {
            uid: auth.user.uid,
            username: auth.user.username,
            wallet_address: auth.user.wallet_address
        };
        updateStatus("👤 " + currentUser.username);
        document.getElementById("btn-login").style.display = "none";
        tryEnablePaymentButtons();
    } catch (e) {
        updateStatus("❌ Login gagal");
    }
}
