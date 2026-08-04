///TIMEBAR SCRIPTS - Start
function updateClock(){
  let now = new Date();
  let h = String(now.getHours()).padStart(2,"0");
  let m = String(now.getMinutes()).padStart(2,"0");
  let s = String(now.getSeconds()).padStart(2,"0");
  let clockEl = document.getElementById('current-time');
  if(clockEl){
    clockEl.innerText = h+":"+m+":"+s;
  }
}

function updateDates(){
  let now = new Date();
  let options = { day: 'numeric', month: 'long', year: 'numeric' };
  let gregorian = now.toLocaleDateString('es-ES', options);

  fetch(`https://api.aladhan.com/v1/gToH?date=${now.getDate()}-${now.getMonth()+1}-${now.getFullYear()}`)
    .then(response => response.json())
    .then(json => {
      let hijriDate = json.data.hijri.day + " " + json.data.hijri.month.en + " " + json.data.hijri.year;
      let dateEl = document.getElementById('date-block');
      if(dateEl){
        dateEl.innerHTML = gregorian + "<br>" + hijriDate;
      }
    })
    .catch(err => {
      let dateEl = document.getElementById('date-block');
      if(dateEl){
        dateEl.innerHTML = gregorian + "<br>(Cargando...)";
      }
    });
}
// вывод названия текущего намаза рядом с часами
function updateCurrentPrayer(current){
  let cp = document.getElementById('current-prayer');
  if(cp){
    if(current && ["Fajr","Dhuhr","Asr","Maghrib","Isha"].includes(current.name)){
      cp.innerText = current.name.toUpperCase();

      // вычисляем оставшееся время
      let now = new Date();
      if(current.end){ // проверяем что end существует
        let diff = (current.end - now) / 1000; // секунды до конца
        if(diff <= 300){ // последние 5 минут
          cp.classList.add("warning");
        } else {
          cp.classList.remove("warning");
        }
      }
    } else {
      cp.innerText = "";
      cp.classList.remove("warning");
    }
  }
}


window.addEventListener("load", () => {
  updateClock();
  setInterval(updateClock,1000);

  updateDates();
  setInterval(updateDates,60000);

  updatePrayerCounter();
  setInterval(updatePrayerCounter,1000);
});