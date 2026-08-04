function parseTimeStr(str){
  let [h,m] = str.split(":").map(Number);
  let d = new Date();
  d.setHours(h,m,0,0);
  return d;
}
function formatTimeStr(d){
  return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
}
function addMinutesStr(str, mins){
  let d = parseTimeStr(str);
  d.setMinutes(d.getMinutes()+mins);
  return formatTimeStr(d);
}
function subtractMinutesStr(str, mins){
  let d = parseTimeStr(str);
  d.setMinutes(d.getMinutes()-mins);
  return formatTimeStr(d);
}

document.addEventListener("DOMContentLoaded", () => {
  let now = new Date();
  let currentMonth = now.getMonth(); // 0–11
  let currentYear = now.getFullYear();

  const meses = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
  ];

  async function loadMonth(month, year){
    let mm = String(month+1).padStart(2,'0');
    let yyyy = year;
    let fileName = `${mm}-${yyyy}.csv`;

    try {
      let res = await fetch(`Schedules/${fileName}`);
      let text = await res.text();
      let rows = text.split("\n").filter(Boolean);

      let gregorianMonth = meses[month] + " " + yyyy;
      document.getElementById("month-header").innerHTML = `<h2>${gregorianMonth}</h2>`;

      let today = new Date();
      let ddToday = String(today.getDate()).padStart(2,'0');
      let mmToday = String(today.getMonth()+1).padStart(2,'0');
      let yyyyToday = today.getFullYear();
      let todayStr = `${ddToday}-${mmToday}-${yyyyToday}`;

      let table = "<table class='calendar-table'><tr><th>Fecha</th><th>Fajr</th><th>Sunrise</th><th>Dhuhr</th><th>Asr</th><th>Maghrib</th><th>Isha</th><th>Tahajjud</th></tr>";

      rows.forEach((line, idx) => {
        if(idx === 0) return; // пропускаем заголовки CSV
        let [country,state,region,date,fajr,sunrise,dhuhr,asr,maghrib,isha,tahajjud] = line.split(",");

        let rowClass = (date === todayStr) ? "current-day" : "";

        let fajrEnd = subtractMinutesStr(sunrise,2);
        let dhuhrEnd = asr;
        let asrEnd = subtractMinutesStr(maghrib,18);
        let maghribEnd = addMinutesStr(maghrib,30);
        let ishaEnd = fajr;
        let tahajjudEnd = fajr;


		
		// исходная строка даты из CSV: "01-06-2026"
let [dd, mm, yyyy] = date.split("-");

// массив месяцев на испанском
const meses = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
];

// преобразованная дата
let fechaBonita = `${dd} ${meses[parseInt(mm)-1]} ${yyyy}`;

table += `<tr class="${rowClass}">
  <td>${fechaBonita}</td>
  <td>${fajr} – ${fajrEnd}</td>
  <td>${sunrise}</td>
  <td>${dhuhr} – ${dhuhrEnd}</td>
  <td>${asr} – ${asrEnd}</td>
  <td>${maghrib} – ${maghribEnd}</td>
  <td>${isha} – ${ishaEnd}</td>
  <td>${tahajjud} – ${tahajjudEnd}</td>
</tr>`;
      });

      table += "</table>";
      document.getElementById("prayers-table").innerHTML = table;
	  
// Обновляем текст кнопок
let prevMonth = month - 1;
let prevYear = year;
if(prevMonth < 0){ prevMonth = 11; prevYear--; }
let nextMonth = month + 1;
let nextYear = year;
if(nextMonth > 11){ nextMonth = 0; nextYear++; }

document.getElementById("prev-month").innerText = `← ${meses[prevMonth]} ${prevYear}`;
document.getElementById("next-month").innerText = `${meses[nextMonth]} ${nextYear} →`;

    } catch(e){
      console.error("Ошибка загрузки CSV:", e);
    }
  }

  // кнопки навигации
  document.getElementById("prev-month").addEventListener("click", () => {
    currentMonth--;
    if(currentMonth < 0){ currentMonth = 11; currentYear--; }
    loadMonth(currentMonth, currentYear);
  });

  document.getElementById("next-month").addEventListener("click", () => {
    currentMonth++;
    if(currentMonth > 11){ currentMonth = 0; currentYear++; }
    loadMonth(currentMonth, currentYear);
  });

  // загрузка текущего месяца
  loadMonth(currentMonth, currentYear);
});
