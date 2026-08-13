const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const session = require('express-session');

const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, 'schedule.db'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index_es.html'));
});

const app = express();

// Сессии
app.use(session({
  secret: 'mySecretKey',
  resave: false,
  saveUninitialized: true
}));

// Middleware
app.use(cors());
app.use(express.static(__dirname));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 📌 Защищённая страница
app.get('/supervisorupload_es.html', (req, res) => {
  if (req.session && req.session.loggedIn) {
    res.sendFile(path.join(__dirname, 'Private', 'supervisorupload_es.html'));
  } else {
    res.redirect('/supervisorpanel_es.html');
  }
});

// 📌 Логин
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const row = db.prepare("SELECT * FROM users WHERE username=? AND password=?").get(username, password);

  if (row) {
    req.session.loggedIn = true;
    res.redirect('/supervisorupload_es.html');
  } else {
    res.send("Неверный логин или пароль");
  }
});

// 📌 Таблица пользователей (пример)
db.prepare(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
)`).run();

// Добавляем пользователя supervisor/12345 если его нет
const userExists = db.prepare("SELECT * FROM users WHERE username=?").get("supervisor");
if (!userExists) {
  db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run("supervisor", "12345");
  console.log("Добавлен пользователь supervisor/12345");
}

// 📌 Импорт CSV
const schedulesDir = path.join(__dirname, 'Schedules');
db.prepare(`DROP TABLE IF EXISTS Schedule_Oracion`).run();
db.prepare(`
  CREATE TABLE Schedule_Oracion (
    COUNTRY TEXT,
    STATE TEXT,
    REGION TEXT,
    DATE TEXT,
    FAJR TEXT,
    SUNRISE TEXT,
    DHUHR TEXT,
    ASR TEXT,
    MAGHRIB TEXT,
    ISHA TEXT,
    TAHAJJUD TEXT
  )
`).run();

fs.readdirSync(schedulesDir).forEach(file => {
  if (file.endsWith('.csv')) {
    const filePath = path.join(schedulesDir, file);
    console.log(`Импортируем: ${filePath}`);

    const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
    const insert = db.prepare(`
      INSERT INTO Schedule_Oracion 
      (COUNTRY, STATE, REGION, DATE, FAJR, SUNRISE, DHUHR, ASR, MAGHRIB, ISHA, TAHAJJUD)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const line of lines) {
      const [country, state, region, date, fajr, sunrise, dhuhr, asr, maghrib, isha, tahajjud] = line.split(',');
      insert.run(country, state, region, date, fajr, sunrise, dhuhr, asr, maghrib, isha, tahajjud);
    }
  }
});

// 📌 API выборка по дате и региону
app.get('/api/Schedule_Oracion', (req, res) => {
  const { date, region } = req.query;
  const row = db.prepare("SELECT * FROM Schedule_Oracion WHERE DATE = ? AND REGION = ?").get(date, region);
  res.json(row || {});
});

// 📌 API для главной страницы (5 дней вокруг текущего)
app.get('/api/prayers', (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM Schedule_Oracion
    WHERE date(substr(DATE,7,4) || '-' || substr(DATE,4,2) || '-' || substr(DATE,1,2))
    BETWEEN date('now','-2 day') AND date('now','+2 day')
    ORDER BY DATE ASC
  `).all();

  const formatted = rows.map(r => {
    const parseTime = (str) => {
      if(!str || !str.includes(":")) return null;
      let [h,m] = str.split(":").map(Number);
      let d = new Date();
      d.setHours(h,m,0,0);
      return d;
    };
    const formatTime = (d) => d ? String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0") : "";
    const addMinutes = (str, mins) => { let d=parseTime(str); if(!d) return ""; d.setMinutes(d.getMinutes()+mins); return formatTime(d); };
    const subtractMinutes = (str, mins) => { let d=parseTime(str); if(!d) return ""; d.setMinutes(d.getMinutes()-mins); return formatTime(d); };

    return {
      date: r.DATE,
      fajr: `${r.FAJR} – ${subtractMinutes(r.SUNRISE,2)}`,
      sunrise: r.SUNRISE,
      dhuhr: `${r.DHUHR} – ${r.ASR}`,
      asr: `${r.ASR} – ${subtractMinutes(r.MAGHRIB,18)}`,
      maghrib: `${r.MAGHRIB} – ${addMinutes(r.MAGHRIB,30)}`,
      isha: `${r.ISHA} – ${r.FAJR}`,
      tahajjud: `${r.TAHAJJUD} – ${r.FAJR}`
    };
  });

  res.json(formatted);
});

// 📌 Загрузка CSV
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'Schedules')),
  filename: (req, file, cb) => cb(null, file.originalname)
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = path.basename(file.originalname);
    if (ext !== '.csv') return cb(new Error('❌ Only CSV files are allowed'), false);
    if (!/^\d{2}-\d{4}\.csv$/.test(name)) return cb(new Error('❌ Wrong filename. Must be MM-YYYY.csv'), false);
    cb(null, true);
  }
});

app.post('/upload', upload.single('csvfile'), (req, res) => {
  if (!req.file) return res.status(400).send("❌ Invalid file.");
  res.send("✅ Archivo CSV subido correctamente!");
});

// 📌 Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
