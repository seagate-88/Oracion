const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const Database = require('better-sqlite3');
const db = new Database('./schedule.db');

const session = require('express-session');
app.use(session({
  secret: 'mySecretKey',
  resave: false,
  saveUninitialized: true
}));

// Middleware
app.use(cors());
app.use(express.static(__dirname));   // раздаём HTML, CSS, JS
app.use(express.urlencoded({ extended: true })); // читаем формы


app.get('/supervisorupload_es.html', (req, res) => {
  if (req.session && req.session.loggedIn) {
    res.sendFile(path.join(__dirname, 'Private', 'supervisorupload_es.html'));
  } else {
    res.redirect('/supervisorpanel_es.html'); // страница логина
  }
});

// 📌 Маршрут логина
app.post('/login', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  db.get("SELECT * FROM users WHERE username=? AND password=?", [username, password], (err, row) => {
    if (err) {
      res.send("Ошибка базы данных");
    } else if (row) {
      req.session.loggedIn = true;
      res.redirect('/supervisorupload_es.html');
    } else {
      res.send("Неверный логин или пароль");
    }
  });
});



app.get('/supervisorupload_es.html', (req, res) => {
  if (req.session && req.session.loggedIn) {
    res.sendFile(path.join(__dirname, 'supervisorupload_es.html'));
  } else {
    res.redirect('/supervisorpanel_es.html');
  }
});



  //// 📌 Таблица пользователей (один супервизор)
  //db.serialize(() => {
  //  db.run(`CREATE TABLE IF NOT EXISTS users (
  //    id INTEGER PRIMARY KEY AUTOINCREMENT,
  //    username TEXT UNIQUE NOT NULL,
  //    password TEXT NOT NULL
  //  )`);

  // Вставляем пользователя, если его нет
  //  db.get("SELECT * FROM users WHERE username = ?", ["supervisor"], (err, row) => {
  //    if (!row) {
  //      db.run("INSERT INTO users (username, password) VALUES (?, ?)", ["supervisor", "12345"]);
  //      console.log("Добавлен пользователь supervisor/12345");
  //    }
  //  });
  //});



// 📌 Папка с CSV файлами
const schedulesDir = path.join(__dirname, 'Schedules');

// 📌 Создаём таблицу и загружаем все CSV
db.serialize(() => {
  db.run(`DROP TABLE IF EXISTS Schedule_Oracion`);
  db.run(`
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
  `);

  fs.readdirSync(schedulesDir).forEach(file => {
    if (file.endsWith('.csv')) {
      const filePath = path.join(schedulesDir, file);
      console.log(`Импортируем: ${filePath}`);

      const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);

      lines.forEach(line => {
        const [country, state, region, date, fajr, sunrise, dhuhr, asr, maghrib, isha, tahajjud] = line.split(',');

        db.run(`
          INSERT INTO Schedule_Oracion 
          (COUNTRY, STATE, REGION, DATE, FAJR, SUNRISE, DHUHR, ASR, MAGHRIB, ISHA, TAHAJJUD)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [country, state, region, date, fajr, sunrise, dhuhr, asr, maghrib, isha, tahajjud]);
      });
    }
  });
});

// 📌 API для выборки по дате и региону
app.get('/api/Schedule_Oracion', (req, res) => {
  const { date, region } = req.query;
  db.get(
    "SELECT * FROM Schedule_Oracion WHERE DATE = ? AND REGION = ?",
    [date, region],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else if (!row) {
        res.json({});
      } else {
        res.json(row);
      }
    }
  );
});

// 📌 API для главной страницы (5 дней вокруг текущего)
app.get('/api/prayers', (req, res) => {
  db.all(`
    SELECT * FROM Schedule_Oracion
    WHERE date(substr(DATE,7,4) || '-' || substr(DATE,4,2) || '-' || substr(DATE,1,2))
    BETWEEN date('now','-2 day') AND date('now','+2 day')
    ORDER BY DATE ASC;
  `, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      const formatted = rows.map(r => {
        const parseTime = (str) => {
          if(!str || !str.includes(":")) return null;
          let [h,m] = str.split(":").map(Number);
          let d = new Date();
          d.setHours(h,m,0,0);
          return d;
        };
        const formatTime = (d) => {
          if(!d) return "";
          return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
        };
        const addMinutes = (str, mins) => {
          let d = parseTime(str);
          if(!d) return "";
          d.setMinutes(d.getMinutes()+mins);
          return formatTime(d);
        };
        const subtractMinutes = (str, mins) => {
          let d = parseTime(str);
          if(!d) return "";
          d.setMinutes(d.getMinutes()-mins);
          return formatTime(d);
        };

        const fajrEnd = subtractMinutes(r.SUNRISE,2);
        const dhuhrEnd = r.ASR;
        const asrEnd = subtractMinutes(r.MAGHRIB,18);
        const maghribEnd = addMinutes(r.MAGHRIB,30);
        const ishaEnd = r.FAJR;
        const tahajjudEnd = r.FAJR;

        return {
          date: r.DATE,
          fajr: `${r.FAJR} – ${fajrEnd}`,
          sunrise: r.SUNRISE,
          dhuhr: `${r.DHUHR} – ${dhuhrEnd}`,
          asr: `${r.ASR} – ${asrEnd}`,
          maghrib: `${r.MAGHRIB} – ${maghribEnd}`,
          isha: `${r.ISHA} – ${ishaEnd}`,
          tahajjud: `${r.TAHAJJUD} – ${tahajjudEnd}`
        };
      });
      res.json(formatted);
    }
  });
});

// 📌 Хранилище для CSV
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'Schedules'));
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 }, // максимум 5 KB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = path.basename(file.originalname);

    // Проверка расширения
    if (ext !== '.csv') {
      return cb(new Error('❌ Solo se permiten archivos CSV / Only CSV files are allowed'), false);
    }

    // Проверка имени файла (MM-YYYY.csv)
    const regex = /^\d{2}-\d{4}\.csv$/;
    if (!regex.test(name)) {
      return cb(new Error('❌ Nombre incorrecto. Debe ser MM-YYYY.csv / Wrong filename. Must be MM-YYYY.csv'), false);
    }

    cb(null, true); // всё ок
  }
});

app.post('/upload', upload.single('csvfile'), (req, res) => {
  if (!req.file) {
    return res.status(400).send("❌ Error: Archivo inválido / Invalid file.");
  }
  res.send("✅ Archivo CSV subido correctamente!");
});




// 📌 Запуск сервера
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

