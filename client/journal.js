const $ = (sel) => document.querySelector(sel);
const tbody = $('#tbl tbody');
const meta = $('#meta');
const pre = $('#json');

async function listJournals() {
  const res = await fetch('/api/journals');
  if (!res.ok) throw new Error('Failed to load journals');
  return res.json();
}

async function getJournal(id) {
  const res = await fetch(`/api/journals/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Failed to load journal');
  return res.json();
}

function fmtBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024; if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024; return `${mb.toFixed(1)} MB`;
}

function renderRows(items) {
  tbody.innerHTML = '';
  for (const it of items) {
    const tr = document.createElement('tr');
    // Show the journal type more clearly
    const journalType = it.id.startsWith('match_') ? 'match' : 'session';
    const displayId = it.id.length > 40 ? it.id.substring(0, 40) + '...' : it.id;

    // Extract just the match ID from journals that have one
    let matchDisplay = '';
    if (it.matchId) {
      // If matchId exists, show just the match ID part
      const matchIdParts = it.matchId.split('_');
      matchDisplay = `<span class="badge">${matchIdParts.slice(0, 2).join('-')}</span>`;
    } else if (journalType === 'session') {
      matchDisplay = '<span class="muted">—</span>';
    }

    tr.innerHTML = `
      <td class="mono" title="${it.id}">${displayId}</td>
      <td>${matchDisplay}</td>
      <td>${new Date(it.createdAt).toLocaleString()}</td>
      <td>${it.eventCount ?? '—'}</td>
      <td>${fmtBytes(it.fileSize ?? 0)}</td>
      <td><button class="btn" data-id="${it.id}">Open</button></td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll('button[data-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      btn.disabled = true;
      try {
        const data = await getJournal(id);
        const { metadata, entries } = data;
        meta.innerHTML = `
          <div><strong>ID:</strong> <span class="mono">${metadata.id}</span></div>
          <div><strong>Created:</strong> ${new Date(metadata.createdAt).toLocaleString()}</div>
          <div><strong>Match:</strong> ${metadata.matchId ?? '—'}</div>
          <div><strong>Events:</strong> ${metadata.eventCount}</div>
          <div><strong>Players:</strong> ${(metadata.playerIds || []).join(', ')}</div>
        `;
        pre.textContent = JSON.stringify({ metadata, sample: entries.slice(0, 25) }, null, 2);
      } catch (e) {
        alert(String(e));
      } finally {
        btn.disabled = false;
      }
    });
  });
}

async function refresh() {
  $('#refresh').disabled = true;
  try {
    let items = await listJournals();
    const matchId = $('#matchId').value.trim();
    const playerId = $('#playerId').value.trim();
    if (matchId) items = items.filter(it => it.matchId === matchId);
    if (playerId) items = items.filter(it => (it.playerIds || []).includes(playerId));
    // newest first
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    renderRows(items);
  } catch (e) {
    alert(String(e));
  } finally {
    $('#refresh').disabled = false;
  }
}

$('#refresh').addEventListener('click', refresh);
refresh().catch(console.error);

