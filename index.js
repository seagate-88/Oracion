async function loadPrayers(){
  try {
    let res = await fetch('/api/prayers');
    let data = await res.json();

    let table = "<table class='calendar-table'><tr><th>Fecha</th><th>Fajr</th><th>Dhuhr</th><th>Asr</th><th>Maghrib</th><th>Tahajjud</th></tr>";

data.forEach(day => {
  // преобразуем строку "dd-mm-yyyy" из базы
  let [dd, mm, yyyy] = day.date.split("-");
  let dateObj = new Date(`${yyyy}-${mm}-${dd}`);

  // массив месяцев на испанском
  const meses = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
  ];

  // красивый формат для вывода
  let fechaBonita = `${dd} ${meses[parseInt(mm)-1]} ${yyyy}`;

  // сегодняшняя дата в том же формате
  let today = new Date();
  let ddToday = String(today.getDate()).padStart(2,'0');
  let mmToday = String(today.getMonth()+1).padStart(2,'0');
  let yyyyToday = today.getFullYear();
  let todayStr = `${ddToday}-${mmToday}-${yyyyToday}`;

  // сравнение идёт по исходному формату из БД
  let rowClass = (day.date === todayStr) ? "current-day" : "";

  table += `<tr class="${rowClass}">
    <td>${fechaBonita}</td>
    <td>${day.fajr}</td>
    <td>${day.dhuhr}</td>
    <td>${day.asr}</td>
    <td>${day.maghrib}</td>
    <td>${day.tahajjud}</td>
  </tr>`;
});


    table += "</table>";
    document.getElementById("main-table").innerHTML = table;
  } catch(e) {
    console.error("Ошибка загрузки молитв:", e);
  }
}


window.onload = loadPrayers;
