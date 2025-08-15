const path = require('path');
const fs = require('fs');
const fastify = require('fastify')({ logger: false });

fastify.register(require('@fastify/static'),{
  root: path.join(__dirname,'..','app'),
  prefix: '/app/'
});

function iso(d){ return new Date(d).toISOString(); }
function now(){ return new Date(); }

// ===== Persistence (JSON file) =====
const DATA_FILE = path.join(__dirname, 'data.json');

function loadData(){
  if(fs.existsSync(DATA_FILE)){
    try{
      const raw = JSON.parse(fs.readFileSync(DATA_FILE,'utf-8'));
      const teams = Array.isArray(raw.teams) ? raw.teams : [];
      const seats = Array.isArray(raw.seats) ? raw.seats : [];
      return { teams, seats };
    }catch(e){
      console.error('Failed to parse data.json, starting with empty DB', e);
      return { teams: [], seats: [] };
    }
  }
  const created = iso(now());
  const teams = [
    {id:1,nama:'Team Alpha',username:'alpha@example.com',durasi_hari:365,seat_maks:5,created_at:created},
    {id:2,nama:'Team Beta',username:'beta@example.com',durasi_hari:180,seat_maks:4,created_at:created}
  ];
  const tnow = now();
  const seats = [
    {id:1,team_id:1,email:'alpha1@example.com',jenis:'privat',mulai:iso(new Date(tnow.getTime()-3*86400000)),berakhir:iso(new Date(tnow.getTime()+20*86400000))},
    {id:2,team_id:1,email:'alpha2@example.com',jenis:'privat',mulai:iso(tnow),berakhir:iso(new Date(tnow.getTime()+5*86400000))},
    {id:3,team_id:1,email:'alpha3@example.com',jenis:'privat',mulai:iso(new Date(tnow.getTime()-40*86400000)),berakhir:iso(new Date(tnow.getTime()-86400000))},
    {id:4,team_id:2,email:'beta1@example.com',jenis:'sharing',mulai:iso(new Date(tnow.getTime()-7*86400000)),berakhir:iso(new Date(tnow.getTime()+2*86400000))}
  ];
  saveData({teams, seats});
  return { teams, seats };
}

function saveData(db){
  const payload = { teams: db.teams, seats: db.seats, meta: { saved_at: iso(now()) } };
  fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf-8');
}

// In-memory DB
let { teams, seats } = loadData();

// ===== Helpers =====
function seatStatus(seat){
  const nowMs = now().getTime();
  const end = new Date(seat.berakhir).getTime();
  if(end <= nowMs) return 'expired';
  const daysLeft = Math.ceil((end - nowMs)/86400000);
  if(daysLeft <= 3) return 'expiring';
  return 'active';
}
function seatWithStatus(seat){ return { ...seat, status: seatStatus(seat) }; }
function teamWithUsage(team){
  const list = seats.filter(s=> Number(s.team_id) === Number(team.id));
  const active = list.filter(s=> seatStatus(s) === 'active').length;
  const expiring = list.filter(s=> seatStatus(s) === 'expiring').length;
  const expired = list.filter(s=> seatStatus(s) === 'expired').length;
  const used = active + expiring;
  const capacity = team.seat_maks;
  return { ...team, seats_used: used, seats_capacity: capacity, active, expiring, expired };
}
function nextId(arr){
  return arr.length ? Math.max(...arr.map(x=> Number(x.id)||0)) + 1 : 1;
}

// ===== Routes =====

// Summary
fastify.get('/api/summary', async (req, reply) => {
  const counts = {
    active: seats.filter(s=> seatStatus(s)==='active').length,
    expiring: seats.filter(s=> seatStatus(s)==='expiring').length,
    expired: seats.filter(s=> seatStatus(s)==='expired').length,
  };
  reply.send({ counts, teams: teams.map(teamWithUsage), seats_total: seats.length, server_time: iso(now()) });
});

// Seats
fastify.get('/api/seats', async (req, reply) => {
  let list = seats.map(seatWithStatus);
  if(req.query.teamId) list = list.filter(s=> Number(s.team_id) === Number(req.query.teamId));
  if(req.query.status) list = list.filter(s=> seatStatus(s) === req.query.status);
  if(req.query.q){
    const q = String(req.query.q).toLowerCase();
    list = list.filter(s=> String(s.email).toLowerCase().includes(q));
  }
  reply.send(list);
});

fastify.post('/api/seats', async (req, reply) => {
  const { team_id, email, jenis, mulai, berakhir } = req.body||{};
  const teamId = Number(team_id);
  const team = teams.find(t=> t.id === teamId);
  if(!team) return reply.code(400).send({ error: 'Team not found' });
  if(!email) return reply.code(400).send({ error: 'Email required' });
  const startDate = new Date(mulai);
  const endDate = new Date(berakhir);
  if(isNaN(startDate) || isNaN(endDate) || endDate <= startDate){
    return reply.code(400).send({ error: 'Invalid dates' });
  }
  const used = seats.filter(s=> Number(s.team_id)===teamId && seatStatus(s)!=='expired').length;
  if(used >= team.seat_maks) return reply.code(400).send({ error: 'Seat full' });
  const id = nextId(seats);
  const seat = {
    id,
    team_id: teamId,
    email,
    jenis: jenis||'basic',
    mulai: startDate.toISOString(),
    berakhir: endDate.toISOString()
  };
  seats.push(seat);
  saveData({teams, seats});
  reply.code(201).send(seatWithStatus(seat));
});

fastify.get('/api/seats/:id', async (req, reply) => {
  const seat = seats.find(s=> s.id == req.params.id);
  if(!seat) return reply.code(404).send({ error: 'Not found' });
  reply.send(seatWithStatus(seat));
});

fastify.put('/api/seats/:id', async (req, reply) => {
  const seat = seats.find(s=> s.id == req.params.id);
  if(!seat) return reply.code(404).send({ error:'Not found' });
  let { email, jenis, mulai, berakhir } = req.body||{};
  const newMulai = mulai ? new Date(mulai) : new Date(seat.mulai);
  const newBerakhir = berakhir ? new Date(berakhir) : new Date(seat.berakhir);
  if(isNaN(newMulai) || isNaN(newBerakhir) || newBerakhir <= newMulai){
    return reply.code(400).send({ error:'Invalid dates' });
  }
  if(email !== undefined) seat.email = email;
  if(jenis !== undefined) seat.jenis = jenis;
  seat.mulai = newMulai.toISOString();
  seat.berakhir = newBerakhir.toISOString();
  saveData({teams, seats});
  reply.send(seatWithStatus(seat));
});

fastify.delete('/api/seats/:id', async (req, reply) => {
  const idx = seats.findIndex(s=> s.id == req.params.id);
  if(idx === -1) return reply.code(404).send({ error:'Not found' });
  seats.splice(idx,1);
  saveData({teams, seats});
  reply.send({ ok:true });
});

// Teams
fastify.get('/api/teams', async (req, reply) => {
  reply.send(teams.map(teamWithUsage));
});

fastify.post('/api/teams', async (req, reply) => {
  const { nama, durasi_hari, seat_maks, username, created_at } = req.body||{};
  if(!nama) return reply.code(400).send({ error:'Nama wajib' });
  const id = nextId(teams);
  const team = {
    id,
    nama,
    username: username||'',
    durasi_hari: Number(durasi_hari)||0,
    seat_maks: Number(seat_maks)||0,
    created_at: created_at ? iso(new Date(created_at)) : iso(now())
  };
  teams.push(team);
  saveData({teams, seats});
  reply.code(201).send(teamWithUsage(team));
});

fastify.get('/api/teams/:id', async (req, reply) => {
  const team = teams.find(t=> t.id == req.params.id);
  if(!team) return reply.code(404).send({ error:'Not found' });
  reply.send(teamWithUsage(team));
});

fastify.put('/api/teams/:id', async (req, reply) => {
  const team = teams.find(t=> t.id == req.params.id);
  if(!team) return reply.code(404).send({ error:'Not found' });
  const { nama, durasi_hari, seat_maks, username, created_at } = req.body||{};
  if(nama !== undefined) team.nama = nama;
  if(username !== undefined) team.username = username;
  if(durasi_hari !== undefined) team.durasi_hari = Number(durasi_hari)||0;
  if(seat_maks !== undefined) team.seat_maks = Number(seat_maks)||0;
  if(created_at !== undefined) team.created_at = iso(new Date(created_at));
  saveData({teams, seats});
  reply.send(teamWithUsage(team));
});

fastify.delete('/api/teams/:id', async (req, reply) => {
  const idx = teams.findIndex(t=> t.id == req.params.id);
  if(idx === -1) return reply.code(404).send({ error:'Not found' });
  const teamId = teams[idx].id;
  teams.splice(idx,1);
  for(let i=seats.length-1;i>=0;i--){
    if(seats[i].team_id == teamId) seats.splice(i,1);
  }
  saveData({teams, seats});
  reply.send({ ok:true });
});

// ===== Export / Import =====
fastify.get('/api/export', async (req, reply) => {
  const payload = { version:1, exported_at: iso(now()), teams, seats };
  if(req.query.download){
    const fname = `backup-control-meowlie-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
    reply.header('Content-Disposition', `attachment; filename="${fname}"`);
  }
  reply.header('Content-Type','application/json; charset=utf-8');
  reply.send(payload);
});

fastify.post('/api/import', async (req, reply) => {
  const body = req.body || {};
  const data = body.data || body;
  if(!data || !Array.isArray(data.teams) || !Array.isArray(data.seats)){
    return reply.code(400).send({ error:'Format tidak valid. Harus {teams:[], seats:[]}' });
  }
  // Normalize
  const newTeams = data.teams.map(t=> ({
    id: Number(t.id),
    nama: String(t.nama||''),
    username: String(t.username||''),
    durasi_hari: Number(t.durasi_hari)||0,
    seat_maks: Number(t.seat_maks)||0,
    created_at: iso(new Date(t.created_at||now()))
  }));
  // Fix duplicate or missing IDs
  const seen = new Set();
  newTeams.forEach((t,i)=>{
    if(!t.id || seen.has(t.id)){
      t.id = (i?Math.max(...newTeams.slice(0,i).map(x=>x.id)):0) + 1;
    }
    seen.add(t.id);
  });
  const idSet = new Set(newTeams.map(t=> t.id));
  const newSeatsRaw = data.seats.map(s=>({
    id: Number(s.id),
    team_id: Number(s.team_id),
    email: String(s.email||''),
    jenis: String(s.jenis||'basic'),
    mulai: iso(new Date(s.mulai||now())),
    berakhir: iso(new Date(s.berakhir||now()))
  }));
  const newSeats = [];
  let dropped=0;
  const usedSeatIds = new Set();
  for(const s of newSeatsRaw){
    if(!idSet.has(s.team_id)){ dropped++; continue; }
    let sid = s.id;
    if(!sid || usedSeatIds.has(sid)){
      sid = (newSeats.length?Math.max(...newSeats.map(x=>x.id)):0)+1;
    }
    usedSeatIds.add(sid);
    newSeats.push({ ...s, id: sid });
  }
  teams = newTeams;
  seats = newSeats;
  saveData({teams, seats});
  reply.send({ ok:true, teams: teams.length, seats: seats.length, seats_dropped: dropped });
});

const PORT = process.env.PORT || 5173;
fastify.listen({ port: PORT, host: '0.0.0.0' })
  .then(()=> console.log('server running on', PORT))
  .catch(err=>{ console.error(err); process.exit(1); });
