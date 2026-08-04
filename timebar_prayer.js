//TIMEBAR - PRAYER-BLOCK - Start
function parseTime(str){
  let [h,m] = str.split(":").map(Number);
  let d = new Date();
  d.setHours(h,m,0,0);
  return d;
}

function addMinutes(date, mins){
  return new Date(date.getTime() + mins*60000);
}

function subtractMinutes(date, mins){
  return new Date(date.getTime() - mins*60000);
}

function formatDateForDB(date){
  const day = String(date.getDate()).padStart(2,"0");
  const month = String(date.getMonth()+1).padStart(2,"0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function updatePrayerCounter(){
  let now = new Date();
  let today = formatDateForDB(now);
  let yesterday = formatDateForDB(new Date(now.getTime() - 24*60*60*1000));
  let tomorrow = formatDateForDB(new Date(now.getTime() + 24*60*60*1000));
  let region = "GDL";

  Promise.all([
    fetch(`http://localhost:3000/api/Schedule_Oracion?date=${today}&region=${region}`).then(r=>r.json()),
    fetch(`http://localhost:3000/api/Schedule_Oracion?date=${yesterday}&region=${region}`).then(r=>r.json()),
    fetch(`http://localhost:3000/api/Schedule_Oracion?date=${tomorrow}&region=${region}`).then(r=>r.json())
  ])
  .then(([dataToday, dataYesterday, dataTomorrow])=>{
    if(!dataToday || Object.keys(dataToday).length===0){
      console.log("Нет данных для даты:", today);
      return;
    }

    // преобразуем строки времени
    let fajr = parseTime(dataToday.FAJR);
    let sunrise = parseTime(dataToday.SUNRISE);
    let dhuhr = parseTime(dataToday.DHUHR);
    let asr = parseTime(dataToday.ASR);
    let maghrib = parseTime(dataToday.MAGHRIB);

    // фиксируем даты для Isha и FajrTomorrow
    let ishaStart = parseTime(dataToday.ISHA);
    // если сейчас ночь (до Fajr), то Isha началась вчера вечером
    if(now.getHours() < 5){
      ishaStart.setDate(now.getDate() - 1);
    } else {
      ishaStart.setDate(now.getDate());
    }

    let fajrTomorrow = parseTime(dataTomorrow.FAJR);
    // Fajr всегда следующий день
    if(now.getHours() < 5){
      fajrTomorrow.setDate(now.getDate());
    } else {
      fajrTomorrow.setDate(now.getDate() + 1);
    }

    // окончания
    let fajrEnd = subtractMinutes(sunrise,2);
    let dhuhrEnd = asr;
    let asrEnd = subtractMinutes(maghrib,18);
    let maghribEnd = addMinutes(maghrib,30);

    // обычные намазы
    let prayers = [
      {name:"Fajr", start:fajr, end:fajrEnd},
      {name:"Dhuhr", start:dhuhr, end:dhuhrEnd},
      {name:"Asr", start:asr, end:asrEnd},
      {name:"Maghrib", start:maghrib, end:maghribEnd},
      {name:"Isha", start:ishaStart, end:fajrTomorrow}
    ];

    // Tahajjud
    let tahajjud = null;
    if(dataToday && dataTomorrow){
      let fajrToday = parseTime(dataToday.FAJR);
      if(now < fajrToday){
        let tahajjudToday = parseTime(dataToday.TAHAJJUD);
        tahajjud = {name:"Tahajjud", start:tahajjudToday, end:fajrToday};
      } else {
        let tahajjudTomorrow = parseTime(dataTomorrow.TAHAJJUD);
        let fajrNext = parseTime(dataTomorrow.FAJR);
        fajrNext.setDate(now.getDate() + 1);
        tahajjud = {name:"Tahajjud", start:tahajjudTomorrow, end:fajrNext};
      }
    }

    // определяем текущий и следующий
    let current = null;
    let next = null;

    if(now >= ishaStart && now < fajrTomorrow){
      current = {name:"Isha", start:ishaStart, end:fajrTomorrow};
      next = {name:"Fajr", start:fajr, end:fajrEnd};
    } else {
      for(let i=0; i<prayers.length; i++){
        if(now >= prayers[i].start && now < prayers[i].end){
          current = prayers[i];
          if(i+1 < prayers.length){
            next = prayers[i+1];
          }
          break;
        }
        if(!current && !next && now < prayers[i].start){
          next = prayers[i];
        }
      }
	}

	
    // вывод Prayer-block
    let pb = document.getElementById('prayer-block');
	if(pb){
	  if(current){
		let diff = Math.floor((current.end - now)/1000);
		let hours = Math.floor(diff/3600);
		let minutes = Math.floor((diff%3600)/60);
		let seconds = diff%60;
  
  
    // форматируем время начала и конца
		let startH = String(current.start.getHours()).padStart(2,"0");
		let startM = String(current.start.getMinutes()).padStart(2,"0");
		let endH = String(current.end.getHours()).padStart(2,"0");
		let endM = String(current.end.getMinutes()).padStart(2,"0");

		pb.className = "prayer-block active";
		pb.innerHTML = `
					<div class="prayer-label">Oración actual:
					  <span class="prayer-name">${current.name}</span>
					  <span class="prayer-interval">(${startH}:${startM} - ${endH}:${endM})</span></div>
					<div class="сountdown-pb">
				  Termina en: <span class="time-left-pb">${hours}h ${minutes}m ${seconds}s</span>
					</div>
		`;
	  } else if(next){
		let diff = Math.floor((next.start - now)/1000);
		let hours = Math.floor(diff/3600);
		let minutes = Math.floor((diff%3600)/60);
		let seconds = diff%60;

    // форматируем время начала и конца
		let startH = String(next.start.getHours()).padStart(2,"0");
		let startM = String(next.start.getMinutes()).padStart(2,"0");
		let endH = String(next.end.getHours()).padStart(2,"0");
		let endM = String(next.end.getMinutes()).padStart(2,"0");

pb.className = "prayer-block next";
pb.innerHTML = `<div class="prayer-label">Próxima oración:
                  <span class="prayer-name">${next.name}
				  <span class="prayer-interval">(${startH}:${startM} - ${endH}:${endM})</span></div>
                <div class="countdown-pb">Inicia en: 
                  <span class="time-left-pb">${hours}h ${minutes}m ${seconds}s</span>
                </div>`;

	  }
	}

// Вывод Tahajjud-block
let tb=document.getElementById('tahajjud-block');
if(tb){
  if(tahajjud){
    let thh=String(tahajjud.start.getHours()).padStart(2,"0");
    let tmm=String(tahajjud.start.getMinutes()).padStart(2,"0");
    let teh=String(tahajjud.end.getHours()).padStart(2,"0");
    let tem=String(tahajjud.end.getMinutes()).padStart(2,"0");

    // базовый текст с временем Tahajjud всегда показываем
    tb.innerHTML = `<div class="tahajjud-prayer"> TAHAJJUD </div>
				<span class="prayer-tahajjud">(${thh}:${tmm} – ${teh}:${tem})</span>
				`;
					

    let now2 = new Date();
    let fajrToday = parseTime(dataToday.FAJR);

    // обратные отсчёты только до Fajr
    if(now2 < fajrToday){
      if(now2 < tahajjud.start){
        // обратный отсчёт до начала Tahajjud
        let diff = Math.floor((tahajjud.start - now2)/1000);
        let hours = Math.floor(diff/3600);
        let minutes = Math.floor((diff%3600)/60);
        let seconds = diff%60;

        tb.innerHTML += `<div class="сountdown-tb">
                           Inicia en: <span class="time-left-tb">${hours}h ${minutes}m ${seconds}s</span>
                         </div>`;
      } else if(now2 >= tahajjud.start && now2 <= tahajjud.end){
        // обратный отсчёт до окончания Tahajjud
        let diff = Math.floor((tahajjud.end - now2)/1000);
        let hours = Math.floor(diff/3600);
        let minutes = Math.floor((diff%3600)/60);
        let seconds = diff%60;

        tb.innerHTML += `<div class="сountdown-tb">
                           Termina en: <span class="time-left-tb">${hours}h ${minutes}m ${seconds}s</span>
                         </div>`;
      }
    }
    // после Fajr → остаётся только Horario Tahajjud без счётчиков
  } else {
    tb.innerHTML = "";
  }
}
  // передаём текущий намаз в основной script.js
  updateCurrentPrayer(current);
  
  
  })
  .catch(err=>console.error("Ошибка запроса:", err));
}
//TIMEBAR - PRAYER-BLOCK - End
//TIMEBAR SCRIPTS - End
