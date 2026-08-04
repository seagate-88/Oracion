let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();

const islamicHolidays = {
  "09-01": "Inicio de Ramadán",
  "09-27": "Laylat al-Qadr",
  "10-01": "Eid al-Fitr",
  "12-09": "Day of Arafah",
  "12-10": "Eid al-Adha",
  "01-01": "Inicio del Año Nuevo de Hijri",
  "01-10": "El Día de Ashura",
  "01-12": "Mawlid al-Nabi",
};

const mexicoHolidays = {
  "01-01": "Año Nuevo",
  "02-05": "Día de la Constitución",
  "03-21": "Natalicio de Benito Juárez",
  "05-01": "Día del Trabajo",
  "09-16": "Día de la Independencia",
  "11-02": "El Día de los Muertos",
  "11-20": "Día de la Revolución",
  "12-25": "Navidad"
};

const hijriMonthShort = {
  "Muḥarram": "Muḥ",
  "Ṣafar": "Ṣaf",
  "Rabīʿ al-awwal": "Rab.I",
  "Rabīʿ al-thānī": "Rab.II",
  "Jumādá al-ūlá": "Jum.I",
  "Jumādá al-ākhirah": "Jum.II",
  "Rajab": "Raj",
  "Shaʿbān": "Sha",
  "Ramaḍān": "Ram",
  "Shawwāl": "Shaw",
  "Dhū al-Qaʿdah": "Dhū-Q",
  "Dhū al-Ḥijjah": "Dhū-H"
};

const weekDaysShort = ["Lu","Ma","Mié","Jue","Vi","Sá","Do"];
const weekDaysLong  = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];

// Заполняем список месяцев и годов
function populateMonths(){
  let monthSelect = document.getElementById("month-select");
  let months = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  monthSelect.innerHTML = "";
  for(let m=0; m<12; m++){
    let opt = document.createElement("option");
    opt.value = m;
    opt.text = months[m];
    if(m === currentMonth) opt.selected = true;
    monthSelect.appendChild(opt);
  }
}
function populateYears(){
  let yearSelect = document.getElementById("year-select");
  yearSelect.innerHTML = "";
  for(let y=622; y<=2622; y++){
    let opt = document.createElement("option");
    opt.value = y;
    opt.text = y;
    if(y === currentYear) opt.selected = true;
    yearSelect.appendChild(opt);
  }
}
function populateHijriMonths(currentHijriMonth){
  let hijriMonthSelect = document.getElementById("hijri-month-select");
  let months = ["Muḥarram","Ṣafar","Rabīʿ I","Rabīʿ II","Jumādá I","Jumādá II","Rajab","Shaʿbān","Ramaḍān","Shawwāl","Dhū al-Qaʿdah","Dhū al-Ḥijjah"];
  hijriMonthSelect.innerHTML = "";
  for(let m=1; m<=12; m++){
    let opt = document.createElement("option");
    opt.value = m;
    opt.text = months[m-1];
    if(m === currentHijriMonth) opt.selected = true;
    hijriMonthSelect.appendChild(opt);
  }
}
function populateHijriYears(currentHijriYear){
  let hijriYearSelect = document.getElementById("hijri-year-select");
  hijriYearSelect.innerHTML = "";
  for(let y=1; y<=2000; y++){
    let opt = document.createElement("option");
    opt.value = y;
    opt.text = y + " AH";
    if(y == currentHijriYear) opt.selected = true;
    hijriYearSelect.appendChild(opt);
  }
}

// Навигация
function prevMonth(){
  currentMonth--;
  if(currentMonth < 0){
    currentMonth = 11;
    currentYear--;
  }
  renderCalendar(currentYear, currentMonth);
}
function nextMonth(){
  currentMonth++;
  if(currentMonth > 11){
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar(currentYear, currentMonth);
}
function jumpToDate(){
  currentMonth = parseInt(document.getElementById("month-select").value);
  currentYear = parseInt(document.getElementById("year-select").value);
  renderCalendar(currentYear, currentMonth);
}
async function jumpToHijriDate(){
  let hijriMonth = parseInt(document.getElementById("hijri-month-select").value);
  let hijriYear = parseInt(document.getElementById("hijri-year-select").value);
  try {
    let res = await fetch(`https://api.aladhan.com/v1/hToG?date=1-${hijriMonth}-${hijriYear}`);
    let data = await res.json();
    let gDate = data.data.gregorian;
    currentYear = parseInt(gDate.year);
    currentMonth = gDate.month.number - 1;
    renderCalendar(currentYear, currentMonth);
  } catch(e){
    console.error("Ошибка перевода Хиджри → Григориан", e);
  }
}

// Основная функция отрисовки календаря
async function renderCalendar(year=currentYear, month=currentMonth){
  let daysInMonth = new Date(year, month+1, 0).getDate();
  let firstDay = new Date(year, month, 1).getDay();


let weekDays;
if (window.location.pathname.includes("calendar_es.html")) {
  weekDays = weekDaysLong;   // полные названия
} else {
  weekDays = weekDaysShort;  // короткие названия
}

let table = "<table class='calendar-table'><tr>";
weekDays.forEach(d => table += "<th>"+d+"</th>");
table += "</tr><tr>";


  // пустые ячейки в начале месяца
  for(let i=1;i<=(firstDay+6)%7;i++){ 
    table += "<td class='empty'></td>"; 
  }

  let hijriMonthsSet = new Set();
  let hijriYear = "";

  for(let d=1; d<=daysInMonth; d++){
    let isToday = (d===new Date().getDate() && year===new Date().getFullYear() && month===new Date().getMonth());
    let formatted = `${d}-${month+1}-${year}`;
    let hijriData = await fetchHijriDay(formatted);

    hijriMonthsSet.add(hijriData.month);
    if(d === 1) hijriYear = hijriData.year;

    let holidayClass = "";
    let holidayTitle = "";

    let hijriShortKey = `${String(hijriData.monthNumber).padStart(2,"0")}-${String(hijriData.day).padStart(2,"0")}`;
    let shortKey = `${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

    if(islamicHolidays[hijriShortKey] && mexicoHolidays[shortKey]){
      holidayClass = "double-holiday";
      holidayTitle = islamicHolidays[hijriShortKey] + " & " + mexicoHolidays[shortKey];
    } else if(islamicHolidays[hijriShortKey]){
      holidayClass = "islamic-holiday";
      holidayTitle = islamicHolidays[hijriShortKey];
    } else if(mexicoHolidays[shortKey]){
      holidayClass = "mexico-holiday";
      holidayTitle = mexicoHolidays[shortKey];
    }

    // подсветка дней недели
    let dayOfWeek = new Date(year, month, d).getDay();
    if(dayOfWeek === 0) holidayClass += " sunday";
    if(dayOfWeek === 6) holidayClass += " saturday";
    if(dayOfWeek === 5) holidayClass += " friday";

    let cellContent = `
      <div class='gregorian-date'>${d}</div>
      <div class='hijri-date'>
		<span class="hijri-day">${hijriData.day}</span>
		<span class="hijri-month">${hijriMonthShort[hijriData.month] || hijriData.month}</span>
</div>`
;

    table += `<td class='${isToday?"today":""} ${holidayClass}' title='${holidayTitle}'>${cellContent}</td>`;
    if((d+(firstDay+6)%7)%7==0) table += "</tr><tr>";
  }
  table += "</tr></table>";

  let hijriMonthsStr = Array.from(hijriMonthsSet).join(" - ");
  const monthsEs = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];


let header = `
  <h4 class='gregorian-header'>${monthsEs[month]} ${year}</h4>
  <h3 class='hijri-header'>${hijriMonthsStr} ${hijriYear} AH</h3>
`;


  document.getElementById("calendar-header").innerHTML = header;
  document.getElementById("calendar-container").innerHTML = table;
}

// Получение даты Хиджры через API
async function fetchHijriDay(dateStr){
  try {
    let res = await fetch(`https://api.aladhan.com/v1/gToH?date=${dateStr}`);
    let data = await res.json();
    return {
      day: data.data.hijri.day,
      month: data.data.hijri.month.en,
      monthNumber: data.data.hijri.month.number,
      year: data.data.hijri.year
    };
  } catch(e){
    return {day:"",month:"",monthNumber:"",year:""};
  }
}


  // Инициализация
window.addEventListener("load", async () => {
  populateMonths();
  populateYears();

  // получаем текущую дату Хиджры через API
  let today = new Date();
  let formatted = `${today.getDate()}-${today.getMonth()+1}-${today.getFullYear()}`;
  let hijriData = await fetchHijriDay(formatted);

  populateHijriMonths(hijriData.monthNumber);
  populateHijriYears(parseInt(hijriData.year));

  renderCalendar(currentYear, currentMonth);
});
