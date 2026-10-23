/**
 * Budget Rumah — API login untuk dashboard.
 *
 * Dashboard (halaman statis di GitHub Pages) mengirim username + password ke
 * sini. Kalau cocok dengan Script Properties, skrip ini memberi token sesi
 * bertanda tangan (HMAC) yang berlaku 30 hari, lalu membacakan sheet REKAP,
 * REAL dan TRANSAKSI untuk pemegang token itu. Spreadsheet tetap pribadi:
 * yang membaca adalah akun Google pemilik skrip ini, bukan pengunjung.
 *
 * Pengaturan (Project Settings → Script Properties), diisi sendiri oleh pemilik:
 *   APP_USERNAME   username untuk masuk
 *   APP_PASSWORD   password untuk masuk
 *   SESSION_SECRET dibuat otomatis saat pertama login; hapus untuk
 *                  mengeluarkan semua perangkat sekaligus.
 * Mengganti APP_PASSWORD juga mengeluarkan semua perangkat.
 *
 * Skrip ini hanya MEMBACA spreadsheet. Tidak ada satu pun perintah tulis.
 */

const SHEET_ID = '1IsRwEzQ7xJdd0jpzxpGmvhBvx34CVuOElPFfyRs-5fM';
const TABS = { budget: 'REKAP', sisa: 'REAL', tx: 'TRANSAKSI' };
const MAX_COLS = { budget: 78, sisa: 78, tx: 26 };   // BZ untuk REKAP/REAL, Z untuk TRANSAKSI
const SESSION_DAYS = 30;
const MAX_FAILS = 5;          // salah password berturut-turut sebelum dikunci
const LOCK_MINUTES = 15;      // lama kunci setelah salah terakhir

function doGet() {
  return json_({ ok: true, service: 'budget-rumah' });
}

function doPost(e) {
  let req;
  try {
    req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: 'bad_request' });
  }
  try {
    if (req.action === 'login') return json_(login_(req.username, req.password));
    if (req.action === 'data') {
      if (!verifyToken_(req.token)) return json_({ ok: false, error: 'unauthorized' });
      return json_({ ok: true, tabs: readTabs_() });
    }
    return json_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return json_({ ok: false, error: 'server_error', message: String((err && err.message) || err) });
  }
}

// ─── LOGIN ────────────────────────────────────────────────────
function login_(username, password) {
  const props = PropertiesService.getScriptProperties();
  const wantUser = props.getProperty('APP_USERNAME');
  const wantPass = props.getProperty('APP_PASSWORD');
  if (!wantUser || !wantPass) return { ok: false, error: 'not_configured' };

  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('login_fails') || 0);
  if (fails >= MAX_FAILS) return { ok: false, error: 'locked', retryMinutes: LOCK_MINUTES };

  const userOk = safeEqual_(String(username || '').trim().toLowerCase(), wantUser.trim().toLowerCase());
  const passOk = safeEqual_(String(password || ''), wantPass);
  if (!(userOk && passOk)) {
    cache.put('login_fails', String(fails + 1), LOCK_MINUTES * 60);
    Utilities.sleep(700);   // memperlambat tebak-tebakan
    const left = MAX_FAILS - fails - 1;
    return left > 0 ? { ok: false, error: 'invalid', attemptsLeft: left }
                    : { ok: false, error: 'locked', retryMinutes: LOCK_MINUTES };
  }
  cache.remove('login_fails');
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  return { ok: true, token: makeToken_(expires), expires: expires };
}

// ─── TOKEN SESI ───────────────────────────────────────────────
// Format: v1.<kedaluwarsa ms>.<HMAC-SHA256>. Kuncinya SESSION_SECRET + password,
// jadi mengganti password atau menghapus SESSION_SECRET membatalkan semua token.
function signingKey_() {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty('SESSION_SECRET');
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('SESSION_SECRET', secret);
  }
  return secret + '|' + (props.getProperty('APP_PASSWORD') || '');
}
function sign_(payload) {
  const raw = Utilities.computeHmacSha256Signature(payload, signingKey_());
  return Utilities.base64EncodeWebSafe(raw).replace(/=+$/, '');
}
function makeToken_(expires) {
  const payload = 'v1.' + expires;
  return payload + '.' + sign_(payload);
}
function verifyToken_(token) {
  if (typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return false;
  const expires = Number(parts[1]);
  if (!(expires > Date.now())) return false;
  return safeEqual_(parts[2], sign_(parts[0] + '.' + parts[1]));
}
function safeEqual_(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ─── BACA SHEET ───────────────────────────────────────────────
// Nilai dikirim persis seperti tampil di sheet (getDisplayValues), sama
// dengan yang dulu dibaca dashboard lewat Google Sheets API.
function readTabs_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const byName = {};
  ss.getSheets().forEach(function (sh) { byName[sh.getName().trim().toLowerCase()] = sh; });
  const out = {};
  Object.keys(TABS).forEach(function (key) {
    const sh = byName[TABS[key].toLowerCase()];
    if (!sh) throw new Error('Sheet ' + TABS[key] + ' tidak ditemukan');
    const rows = sh.getLastRow();
    const cols = Math.min(sh.getLastColumn(), MAX_COLS[key]);
    const values = rows > 0 && cols > 0 ? sh.getRange(1, 1, rows, cols).getDisplayValues() : [];
    out[key] = values.map(trimRow_);
  });
  return out;
}
function trimRow_(row) {
  let n = row.length;
  while (n > 0 && row[n - 1] === '') n--;
  return row.slice(0, n);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
