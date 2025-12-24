// --- KONFIGURASI SYSTEM ---
const CONFIG = { owner: 'DimasMahardika24', repo: 'DbUsers', path: 'Db.json' };
let githubToken = '', localData = [], currentSha = '';

// Inisialisasi Toast Notification (Kecil di pojok)
const Toast = Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000,
    timerProgressBar: true, background: '#161b22', color: '#c9d1d9',
    didOpen: (toast) => { toast.addEventListener('mouseenter', Swal.stopTimer); toast.addEventListener('mouseleave', Swal.resumeTimer); }
});

// Fungsi Animasi Getar (Jika Login Gagal)
function triggerShake() {
    const card = document.getElementById('loginCard');
    const input = document.getElementById('tokenInput');
    card.classList.add('anim-shake'); input.style.borderColor = 'var(--danger)';
    setTimeout(() => { card.classList.remove('anim-shake'); input.style.borderColor = 'var(--border)'; }, 400);
}

// --- LOGIC LOGIN ---
async function login() {
    const token = document.getElementById('tokenInput').value.trim();
    const btn = document.querySelector('button');
    
    // Cek Token Kosong
    if (!token) { triggerShake(); Toast.fire({ icon: 'warning', title: 'Token kosong!' }); return; }
    
    // Animasi Loading Button
    btn.innerText = 'Checking...'; btn.disabled = true; githubToken = token;
    
    // Coba Refresh Data untuk tes koneksi
    const success = await refreshData();
    
    // Reset Button
    btn.innerText = 'Masuk'; btn.disabled = false;
    
    if (success) {
        Swal.fire({
            icon: 'success', title: 'Akses Diterima', showConfirmButton: false, timer: 1500, background: '#161b22', color: '#fff',
            willClose: () => {
                const loginView = document.getElementById('loginView'); loginView.style.opacity = '0';
                setTimeout(() => { loginView.classList.add('hidden'); document.getElementById('dashboardView').style.display = 'block'; }, 500);
            }
        });
    } else { 
        triggerShake(); 
        Swal.fire({ icon: 'error', title: 'Akses Ditolak', text:'Token Salah!', background: '#161b22', color: '#fff' }); 
    }
}

function logout() { location.reload(); }

// --- LOGIC AMBIL DATA DARI GITHUB ---
async function refreshData() {
    showLoading(true);
    try {
        const res = await fetch(`https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${CONFIG.path}`, {
            headers: { 'Authorization': `token ${githubToken}`, 'Accept': 'application/vnd.github.v3+json' }
        });
        if (!res.ok) throw new Error();
        const data = await res.json(); currentSha = data.sha;
        const json = JSON.parse(decodeURIComponent(escape(atob(data.content))));
        localData = Array.isArray(json) ? json : (json.users || []);
        renderTable(localData); showLoading(false); return true;
    } catch { showLoading(false); return false; }
}

// --- LOGIC SIMPAN KE GITHUB (ANIMASI CUSTOM) ---
async function pushToGithub(message, type) {
    showLoading(true);
    const contentEncoded = btoa(unescape(encodeURIComponent(JSON.stringify({ users: localData }, null, 2))));
    
    try {
        const res = await fetch(`https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${CONFIG.path}`, {
            method: 'PUT',
            headers: { 'Authorization': `token ${githubToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: message, content: contentEncoded, sha: currentSha })
        });

        if (res.ok) {
            const data = await res.json(); currentSha = data.content.sha;
            
            // --- SETUP CUSTOM POPUP ---
            let popupTitle = '';
            let popupIconHtml = '';

            if (type === 'add') {
                popupTitle = 'Successfully Added User To Database';
                // Ikon Hijau + Animasi Bounce
                popupIconHtml = '<i class="fa-solid fa-user-plus custom-sa-icon icon-add"></i>';
            } else if (type === 'edit') {
                popupTitle = 'Successfully Edit User In Database';
                // Ikon Kuning + Animasi Wiggle
                popupIconHtml = '<i class="fa-solid fa-pen-to-square custom-sa-icon icon-edit"></i>';
            } else if (type === 'delete') {
                popupTitle = 'Successfully Remove User In Database';
                // Ikon Merah + Animasi Shake
                popupIconHtml = '<i class="fa-solid fa-trash-can custom-sa-icon icon-del"></i>';
            }

            Swal.fire({
                title: popupTitle,
                html: popupIconHtml, // Kita pakai HTML buat masukin ikon custom
                background: '#161b22',
                color: '#fff',
                timer: 2500,
                showConfirmButton: false,
                icon: null // Matikan ikon bawaan SweetAlert (Ceklis)
            });

            refreshData();
        } else {
            Swal.fire({ icon: 'error', title: 'Gagal Simpan', background: '#161b22', color: '#fff' });
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: err.message, background: '#161b22', color: '#fff' });
    } finally { showLoading(false); closeModal(); }
}

// --- FUNGSI RENDER TABEL ---
function renderTable(data) {
    const tbody = document.getElementById('tableBody'); tbody.innerHTML = '';
    if (data.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Kosong</td></tr>'; return; }
    data.forEach((u, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${i+1}</td><td><span class="badge">${u.phone}</span></td><td>${u.username}</td><td>${u.pin}</td>
        <td style="text-align:center"><button class="btn-sm" style="background:var(--warning); color:#000" onclick="openModal('edit', ${i})"><i class="fa-solid fa-pen"></i></button> 
        <button class="btn-sm btn-danger" onclick="deleteUser(${i})"><i class="fa-solid fa-trash"></i></button></td>`;
        tbody.appendChild(tr);
    });
    document.getElementById('totalCount').innerText = `Total: ${data.length} User`;
}

function filterTable() { renderTable(localData.filter(u => u.phone.includes(document.getElementById('searchInput').value.toLowerCase()) || u.username.toLowerCase().includes(document.getElementById('searchInput').value.toLowerCase()))); }
function showLoading(b) { document.getElementById('loadingIndicator').style.display = b ? 'block' : 'none'; document.getElementById('userTable').style.opacity = b ? '0.5' : '1'; }

// --- MODAL CONTROLLER ---
function openModal(mode, idx = null) {
    const m = document.getElementById('userModal'); document.getElementById('editIndex').value = idx ?? -1;
    document.getElementById('modalTitle').innerText = mode === 'edit' ? "Edit User" : "Tambah User";
    const u = idx !== null ? localData[idx] : { phone: '', username: '', pin: '' };
    const p = document.getElementById('inputPhone'); p.value = u.phone; p.disabled = mode === 'edit';
    document.getElementById('inputName').value = u.username; document.getElementById('inputPin').value = u.pin;
    m.style.display = 'flex';
}
function closeModal() { document.getElementById('userModal').style.display = 'none'; }

// --- ACTION BUTTONS ---
function saveUser() {
    const phone = document.getElementById('inputPhone').value.trim();
    const username = document.getElementById('inputName').value.trim();
    const pin = document.getElementById('inputPin').value.trim();
    const idx = parseInt(document.getElementById('editIndex').value);
    if (!phone || !username || !pin) return Toast.fire({ icon: 'warning', title: 'Isi semua data!' });

    if (idx === -1) {
        if (localData.find(u => u.phone === phone)) return Swal.fire({ icon: 'error', title: 'Duplikat!', background: '#161b22', color: '#fff' });
        localData.push({ phone, username, pin });
        pushToGithub(`Add: ${username}`, 'add'); // Tipe 'add'
    } else {
        localData[idx].username = username; localData[idx].pin = pin;
        pushToGithub(`Edit: ${phone}`, 'edit'); // Tipe 'edit'
    }
}

function deleteUser(idx) {
    const u = localData[idx];
    Swal.fire({
        title: 'Hapus User?', text: u.username, icon: 'warning', showCancelButton: true, confirmButtonColor: '#da3633', cancelButtonColor: '#30363d', confirmButtonText: 'Hapus', background: '#161b22', color: '#fff'
    }).then((r) => { if (r.isConfirmed) { localData.splice(idx, 1); pushToGithub(`Del: ${u.phone}`, 'delete'); } }) // Tipe 'delete'
}
