let bahasa = "ms";

function switchLanguage(lang) {
    bahasa = lang;
    
    const teks = {
        ms: {
            sub: "Pi Anda, Legasi Anda.",
            vault: "✦ PETI SIMPANAN ✦",
            payout: "TUNTUT TESTNET PI (A2U)",
            descPayout: "Sahkan sistem pembayaran kami.",
            sentinel: "DOSSIER PI SENTINEL",
            descSentinel: "Panduan strategik untuk Pioneer.",
            echelon: "PEK TAKLIMAT ECHELON",
            descEchelon: "Aset perisikan tahap lanjutan.",
            command: "SUIT PUSAT KAWALAN",
            descCommand: "Protokol kawalan pentadbiran penuh.",
            sop: "📜 SOP PENGHANTARAN MALAYSIA",
            security: "⚠️ MB LEGACY STORE TIDAK AKAN MEMINTA FRASA LALUAN WALLET ANDA!",
            copy: "📋 SALIN SOP PENIAGA",
            wait: "⏳ Menunggu Sambungan..."
        },
        en: {
            sub: "Your Pi, Your Legacy.",
            vault: "✦ THE VAULT ✦",
            payout: "CLAIM TESTNET PI (A2U)",
            descPayout: "Verify our payout system.",
            sentinel: "THE PI SENTINEL DOSSIER",
            descSentinel: "Strategic primer for Pioneers.",
            echelon: "THE ECHELON BRIEFING PACK",
            descEchelon: "Advanced tier intelligence assets.",
            command: "THE COMMAND CENTER SUITE",
            descCommand: "Full administrative control protocol.",
            sop: "📜 MALAYSIA SHIPPING SOP",
            security: "⚠️ MB LEGACY STORE WILL NEVER ASK FOR YOUR WALLET PASSPHRASE!",
            copy: "📋 COPY MERCHANT SOP",
            wait: "⏳ Waiting for Connection..."
        },
        id: {
            sub: "Pi Anda, Warisan Anda.",
            vault: "✦ LEMARI BESI ✦",
            payout: "KLAIM TESTNET PI (A2U)",
            descPayout: "Verifikasi sistem pembayaran kami.",
            sentinel: "DOSSIER PI SENTINEL",
            descSentinel: "Panduan strategis untuk Pioneer.",
            echelon: "PAKET PENGARAHAN ECHELON",
            descEchelon: "Aset intelijen tingkat lanjut.",
            command: "SUITE PUSAT KENDALI",
            descCommand: "Protokol kendali administrasi penuh.",
            sop: "📜 SOP PENGIRIMAN MALAYSIA",
            security: "⚠️ MB LEGACY STORE TIDAK AKAN MEMINTA FRASA SANDI WALLET ANDA!",
            copy: "📋 SALIN SOP PEDAGANG",
            wait: "⏳ Menunggu Koneksi..."
        },
        zh: {
            sub: "您的Pi，您的遗产。",
            vault: "✦ 保险库 ✦",
            payout: "领取测试网Pi (A2U)",
            descPayout: "验证我们的支付系统。",
            sentinel: "Pi哨兵档案",
            descSentinel: "先驱者战略指南。",
            echelon: "梯队简报包",
            descEchelon: "高级情报资产。",
            command: "指挥中心套件",
            descCommand: "完全管理控制协议。",
            sop: "📜 马来西亚运输标准操作程序",
            security: "⚠️ MB LEGACY STORE 绝不会要求您提供钱包密码！",
            copy: "📋 复制商家SOP",
            wait: "⏳ 等待连接..."
        },
        ar: {
            sub: "باي، إرثك.",
            vault: "✦ الخزينة ✦",
            payout: "مطالبة باي الاختبار (A2U)",
            descPayout: "تحقق من نظام الدفع لدينا.",
            sentinel: "ملف باي الحارس",
            descSentinel: "دليل استراتيجي للرواد.",
            echelon: "حزمة إحاطة إيشيلون",
            descEchelon: "أصول استخباراتية متقدمة.",
            command: "جناح مركز القيادة",
            descCommand: "بروتوكول تحكم إداري كامل.",
            sop: "📜 إجراءات الشحن القياسية لماليزيا",
            security: "⚠️ متجر إم بي ليجاسي لن يطلب منك عبارة مرور محفظتك أبدًا!",
            copy: "📋 نسخ إجراءات التاجر",
            wait: "⏳ في انتظار الاتصال..."
        }
    };

    const t = teks[lang];
    document.getElementById("sub-title").textContent = t.sub;
    document.getElementById("vault-title").textContent = t.vault;
    document.getElementById("title-payout").textContent = t.payout;
    document.getElementById("desc-payout").textContent = t.descPayout;
    document.getElementById("title-sentinel").textContent = t.sentinel;
    document.getElementById("desc-sentinel").textContent = t.descSentinel;
    document.getElementById("title-echelon").textContent = t.echelon;
    document.getElementById("desc-echelon").textContent = t.descEchelon;
    document.getElementById("title-command").textContent = t.command;
    document.getElementById("desc-command").textContent = t.descCommand;
    document.getElementById("sop-title-ui").textContent = t.sop;
    document.getElementById("security-text").textContent = t.security;
    document.getElementById("btn-copy").textContent = t.copy;
    document.getElementById("stSticky").textContent = t.wait;

    ["en","ms","id","zh","ar"].forEach(function(k) {
        document.getElementById("lang-"+k).classList.remove("active");
    });
    document.getElementById("lang-"+lang).classList.add("active");
}
