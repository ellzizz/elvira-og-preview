// elvira-bot.js
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const moment = require('moment');
moment.locale('id');

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Scan QR dengan WhatsApp kamu...');
});

client.on('ready', () => {
    console.log('🤖 Elvira siap membantu!');
});

client.on('message', async msg => {
    const text = msg.body.toLowerCase();
    const chat = await msg.getChat();
    const data = JSON.parse(fs.readFileSync('./data.json'));

    // MENU
    if (text === '!menu') {
        const media = MessageMedia.fromFilePath('./elvira.jpg');
        const caption = `
🩵🌙 ─〔*Elvira*〕─ 🌙🩵

*Akademik*
!jadwal
 › Lihat jadwal kuliah
!tugas
 › Daftar tugas aktif
!tambahtugas
 › Tambah tugas baru
!hapustugas
 › Hapus tugas

🗓️ *Jadwal & Pengingat*
!tambahjadwal
 › Tambah jadwal kuliah
!cek
 › Lihat jadwal & tugas hari ini

🌟 *Produktivitas*
!notulen
 › Simpan catatan grup
!randompick
 › Pilih anggota acak
!quotes
 › Kirim motivasi
!tambahquote
 › Tambah kutipan sendiri

━━━━━━━━━━━━━━━━━━━━━━━
_"Work hard in silence, let your code scream success."_
        `;

        await chat.sendMessage(media, {
            caption: caption
        });
    }

    // KENALAN
    const greetings = ['!halo', '!hai', '!elvira', 'halo', 'hai', 'elvira', 'hi'];
    if (greetings.includes(text)) {
        return msg.reply(`Hai, aku *Elvira*! Senang bisa bantu kamu 😄
Ketik *!menu* untuk lihat kemampuanku ✨`);
    }

    // QUOTES
    if (text === '!quotes') {
        const quotes = data.quotes && data.quotes.length > 0
            ? data.quotes
            : [
                "💭 'Jangan takut gagal, takutlah untuk berhenti mencoba.'",
                "💡 'Langkah kecil hari ini adalah fondasi besar untuk esok.'",
                "🌸 'Kamu bisa lebih dari yang kamu kira.'"
            ];
        const random = quotes[Math.floor(Math.random() * quotes.length)];
        msg.reply(random);
    }

    // TAMBAH QUOTE
    if (text.startsWith('!tambahquote')) {
        const isi = text.replace('!tambahquote', '').trim();
        if (!isi) return msg.reply('📝 Tulis kutipanmu setelah !tambahquote');
        data.quotes = data.quotes || [];
        data.quotes.push(isi);
        fs.writeFileSync('./data.json', JSON.stringify(data, null, 2));
        msg.reply(`✅ Quote berhasil ditambahkan!`);
    }

    // NOTULEN
    if (text.startsWith('!notulen')) {
        const catatan = text.replace('!notulen', '').trim();
        if (!catatan) return msg.reply('Tulis isi notulennya setelah !notulen ya!');
        msg.reply(`📝 Notulen disimpan:\n"${catatan}"`);
    }

    // RANDOM PICK
    if (text === '!randompick') {
        const participants = chat.participants.map(p => p.id.user);
        const random = participants[Math.floor(Math.random() * participants.length)];
        msg.reply(`🎲 Orang terpilih: wa.me/${random}`);
    }

    // JADWAL
    if (text === '!jadwal') {
        let out = '*📘 Jadwal Kuliah Mingguan:*';
        for (const [hari, list] of Object.entries(data.jadwal)) {
            out += `\n\n📌 *${hari.charAt(0).toUpperCase() + hari.slice(1)}*\n`;
            if (list.length === 0) out += ' (Kosong)\n';
            else list.forEach(item => out += ` • ${item}\n`);
        }
        msg.reply(out);
    }

    // TUGAS
    if (text === '!tugas') {
        if (data.tugas.length === 0) return msg.reply('📭 Belum ada tugas yang tercatat.');
        let tugasList = '*📘 Daftar Tugas Aktif:*\n';
        data.tugas.forEach((t, i) => {
            tugasList += `${i + 1}. ${t.judul} – Deadline: ${t.deadline}\n`;
        });
        msg.reply(tugasList);
    }

    // TAMBAH TUGAS
    if (text.startsWith('!tambahtugas')) {
        const isi = text.replace('!tambahtugas', '').trim();
        const [judul, deadline] = isi.split(' - ');
        if (!judul || !deadline) return msg.reply('⚠️ Format salah! Gunakan: !tambahtugas Judul - Deadline');
        data.tugas.push({ judul, deadline });
        fs.writeFileSync('./data.json', JSON.stringify(data, null, 2));
        msg.reply(`✅ Tugas "${judul}" telah ditambahkan.`);
    }

    // HAPUS TUGAS
    if (text.startsWith('!hapustugas')) {
        const judul = text.replace('!hapustugas', '').trim().toLowerCase();
        const before = data.tugas.length;
        data.tugas = data.tugas.filter(t => t.judul.toLowerCase() !== judul);
        fs.writeFileSync('./data.json', JSON.stringify(data, null, 2));
        const after = data.tugas.length;
        msg.reply(after < before ? `🗑️ Tugas "${judul}" dihapus.` : '❌ Tugas tidak ditemukan.');
    }

    // TAMBAH JADWAL
    if (text.startsWith('!tambahjadwal')) {
        const isi = text.replace('!tambahjadwal', '').trim();
        const [hari, detail] = isi.split(' - ');
        if (!hari || !detail || !data.jadwal[hari.toLowerCase()]) {
            return msg.reply('⚠️ Format salah! Contoh: !tambahjadwal senin - 13.00 - Matkul');
        }
        data.jadwal[hari.toLowerCase()].push(detail);
        fs.writeFileSync('./data.json', JSON.stringify(data, null, 2));
        msg.reply(`✅ Jadwal ditambahkan ke *${hari.toUpperCase()}*.`);
    }

    // CEK HARI INI
    if (text === '!cek') {
        const now = moment().format('dddd').toLowerCase();
        let reply = `📅 *Cek Hari Ini (${now.toUpperCase()})*\n`;

        if (data.jadwal[now]?.length) {
            reply += '\n📘 *Jadwal:*\n';
            data.jadwal[now].forEach(j => reply += ` • ${j}\n`);
        } else {
            reply += '\n📘 Tidak ada jadwal kuliah.\n';
        }

        if (data.tugas.length > 0) {
            reply += '\n📝 *Tugas:*\n';
            data.tugas.forEach((t, i) => reply += ` ${i + 1}. ${t.judul} – ${t.deadline}\n`);
        } else {
            reply += '\n📝 Tidak ada tugas aktif.\n';
        }

        msg.reply(reply);
    }
});

client.initialize();
