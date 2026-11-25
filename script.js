// ============================================
// إعدادات المواقع
// ============================================
const LOCATIONS = {
  istanbul: {
    name: 'إسطنبول',
    emoji: '🇹🇷',
    lat: 41.0082,
    lon: 28.9784,
    timezone: 'Europe/Istanbul',
    prayerMethod: 'Turkey',
    tzLabel: 'بتوقيت إسطنبول'
  },
  aleppo: {
    name: 'حلب',
    emoji: '🇸🇾',
    lat: 36.2021,
    lon: 37.1343,
    timezone: 'Asia/Damascus',
    prayerMethod: 'MuslimWorldLeague',
    tzLabel: 'بتوقيت حلب'
  }
};

let userLocation = null;

// ============================================
// خرائط رموز الطقس
// ============================================
const WEATHER_CODES = {
  0: { icon: '☀️', desc: 'صافٍ' },
  1: { icon: '🌤️', desc: 'صافٍ غالبًا' },
  2: { icon: '⛅', desc: 'غائم جزئيًا' },
  3: { icon: '☁️', desc: 'غائم' },
  45: { icon: '🌫️', desc: 'ضباب' },
  48: { icon: '🌫️', desc: 'ضباب متجمد' },
  51: { icon: '🌦️', desc: 'رذاذ خفيف' },
  53: { icon: '🌦️', desc: 'رذاذ' },
  55: { icon: '🌧️', desc: 'رذاذ كثيف' },
  61: { icon: '🌧️', desc: 'مطر خفيف' },
  63: { icon: '🌧️', desc: 'مطر' },
  65: { icon: '🌧️', desc: 'مطر غزير' },
  71: { icon: '🌨️', desc: 'ثلج خفيف' },
  73: { icon: '🌨️', desc: 'ثلج' },
  75: { icon: '❄️', desc: 'ثلج كثيف' },
  80: { icon: '🌦️', desc: 'زخات مطر' },
  81: { icon: '🌧️', desc: 'زخات متوسطة' },
  82: { icon: '⛈️', desc: 'زخات غزيرة' },
  95: { icon: '⛈️', desc: 'عاصفة رعدية' },
  96: { icon: '⛈️', desc: 'عاصفة مع برد' },
  99: { icon: '⛈️', desc: 'عاصفة شديدة' }
};

function getWeatherInfo(code) {
  return WEATHER_CODES[code] || { icon: '🌡️', desc: 'غير معروف' };
}

// ============================================
// أدوات التاريخ والوقت
// ============================================
const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// دالة إظهار الوقت بالأرقام الإنجليزية دائماً
function getTimeInZone(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);
  
  const hour = parts.find(p => p.type === 'hour').value;
  const minute = parts.find(p => p.type === 'minute').value;
  return `${hour}:${minute}`;
}

function getGregorianDate(date, timezone) {
  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function getHijriDate(date, timezone) {
  return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date) + ' هـ';
}

// ============================================
// حساب أوقات الصلاة
// ============================================
function getPrayerTimes(lat, lon, method, timezone) {
  const coordinates = new adhan.Coordinates(lat, lon);
  const params = adhan.CalculationMethod[method]();
  const date = new Date();

  const offset = getTimezoneOffset(timezone);
  const prayerTimes = new adhan.PrayerTimes(coordinates, date, params);

  const format = (time) => {
    const d = new Date(time.getTime() + offset * 60000);
    const h = String(d.getUTCHours()).padStart(2, '0');
    const m = String(d.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  return {
    fajr: format(prayerTimes.fajr),
    sunrise: format(prayerTimes.sunrise),
    dhuhr: format(prayerTimes.dhuhr),
    asr: format(prayerTimes.asr),
    maghrib: format(prayerTimes.maghrib),
    isha: format(prayerTimes.isha),
    raw: {
      fajr: prayerTimes.fajr,
      sunrise: prayerTimes.sunrise,
      dhuhr: prayerTimes.dhuhr,
      asr: prayerTimes.asr,
      maghrib: prayerTimes.maghrib,
      isha: prayerTimes.isha
    }
  };
}

function getTimezoneOffset(timezone) {
  const now = new Date();
  const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  return (tzDate - utcDate) / 60000;
}

function getNextPrayer(rawTimes) {
  const now = new Date();
  const order = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  for (const key of order) {
    if (rawTimes[key] > now) return key;
  }
  return 'fajr';
}

// ============================================
// جلب الطقس
// ============================================
async function fetchWeather(lat, lon, timezone) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weathercode` +
    `&daily=temperature_2m_max,temperature_2m_min,weathercode` +
    `&timezone=${encodeURIComponent(timezone)}&forecast_days=7`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error('فشل جلب بيانات الطقس');
  return await response.json();
}

// ============================================
// بناء بطاقة HTML
// ============================================
function buildCard(location, weatherData, prayerTimes, secondaryTimeLabel, secondaryTimeValue) {
  const now = new Date();
  const timezone = location.timezone;
  const mainTime = getTimeInZone(now, timezone);

  const gregorian = getGregorianDate(now, timezone);
  const hijri = getHijriDate(now, timezone);

  const currentWeather = getWeatherInfo(weatherData.current.weathercode);
  const currentTemp = Math.round(weatherData.current.temperature_2m);

  let forecastHTML = '';
  for (let i = 0; i < 7; i++) {
    const dateStr = weatherData.daily.time[i];
    const dateObj = new Date(dateStr + 'T12:00:00');
    const dayName = ARABIC_DAYS[dateObj.getDay()];
    const info = getWeatherInfo(weatherData.daily.weathercode[i]);
    const max = Math.round(weatherData.daily.temperature_2m_max[i]);
    const min = Math.round(weatherData.daily.temperature_2m_min[i]);
    
    forecastHTML += `
      <div class="forecast-day">
        <div class="day-name">${dayName}</div>
        <div class="day-icon">${info.icon}</div>
        <div class="day-temps">
          <span class="temp-max">${max}°</span>
          <span class="temp-min">${min}°</span>
        </div>
      </div>
    `;
  }

  const nextPrayer = getNextPrayer(prayerTimes.raw);
  const prayerItems = [
    { key: 'fajr', name: 'الفجر' },
    { key: 'sunrise', name: 'الشروق' },
    { key: 'dhuhr', name: 'الظهر' },
    { key: 'asr', name: 'العصر' },
    { key: 'maghrib', name: 'المغرب' },
    { key: 'isha', name: 'العشاء' }
  ];

  const prayerHTML = prayerItems.map(p => `
    <div class="prayer-item ${p.key === nextPrayer ? 'next' : ''}">
      <span class="name">${p.name}</span>
      <span class="time">${prayerTimes[p.key]}</span>
    </div>
  `).join('');

  return `
    <div class="card" data-location="${location.name}">
      <div class="card-header">
        <div class="card-title">${location.emoji} ${location.name}</div>
      </div>

      <div class="card-time">
        <div class="time-main">
          ${mainTime}
          <span class="time-label">(${location.tzLabel})</span>
        </div>
        <div class="time-secondary">
          <span>🕐</span>
          <span class="time-value">${secondaryTimeValue}</span>
          <span>(${secondaryTimeLabel})</span>
        </div>
      </div>

      <div class="date-block">
        <div class="date-line">
          <span class="icon">📅</span>
          <span>${gregorian}</span>
        </div>
        <div class="date-line">
          <span class="icon">🌙</span>
          <span>${hijri}</span>
        </div>
      </div>

      <div class="weather-block">
        <div class="weather-current">
          <div class="weather-icon">${currentWeather.icon}</div>
          <div>
            <div class="weather-temp">${currentTemp}°C</div>
            <div class="weather-desc">${currentWeather.desc}</div>
          </div>
        </div>
        <div class="weather-forecast">
          ${forecastHTML}
        </div>
      </div>

      <div class="prayer-block">
        <div class="prayer-title">🕌 أوقات الصلاة</div>
        <div class="prayer-list">
          ${prayerHTML}
        </div>
      </div>
    </div>
  `;
}

// ============================================
// الحصول على موقع المستخدم
// ============================================
function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('المتصفح لا يدعم تحديد الموقع'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude
      }),
      (err) => reject(new Error('لم يتم السماح بالوصول للموقع')),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// ============================================
// التحديث الرئيسي
// ============================================
async function renderApp() {
  const container = document.getElementById('cardsContainer');
  
  try {
    const [weatherIstanbul, weatherAleppo] = await Promise.all([
      fetchWeather(LOCATIONS.istanbul.lat, LOCATIONS.istanbul.lon, LOCATIONS.istanbul.timezone),
      fetchWeather(LOCATIONS.aleppo.lat, LOCATIONS.aleppo.lon, LOCATIONS.aleppo.timezone)
    ]);

    const prayersIstanbul = getPrayerTimes(
      LOCATIONS.istanbul.lat, LOCATIONS.istanbul.lon,
      LOCATIONS.istanbul.prayerMethod, LOCATIONS.istanbul.timezone
    );
    const prayersAleppo = getPrayerTimes(
      LOCATIONS.aleppo.lat, LOCATIONS.aleppo.lon,
      LOCATIONS.aleppo.prayerMethod, LOCATIONS.aleppo.timezone
    );

    const istanbulSecondary = getTimeInZone(new Date(), LOCATIONS.aleppo.timezone);
    const istanbulCard = buildCard(
      LOCATIONS.istanbul, weatherIstanbul, prayersIstanbul,
      LOCATIONS.aleppo.tzLabel, istanbulSecondary
    );

    const aleppoSecondary = getTimeInZone(new Date(), LOCATIONS.istanbul.timezone);
    const aleppoCard = buildCard(
      LOCATIONS.aleppo, weatherAleppo, prayersAleppo,
      LOCATIONS.istanbul.tzLabel, aleppoSecondary
    );

    let userCard = '';
    if (userLocation) {
      try {
        const weatherUser = await fetchWeather(
          userLocation.lat, userLocation.lon,
          Intl.DateTimeFormat().resolvedOptions().timeZone
        );
        const prayersUser = getPrayerTimes(
          userLocation.lat, userLocation.lon, 'MuslimWorldLeague',
          Intl.DateTimeFormat().resolvedOptions().timeZone
        );
        const userSecondary = getTimeInZone(new Date(), LOCATIONS.aleppo.timezone);
        
        const userLocationObj = {
          name: 'موقعي الحالي',
          emoji: '📍',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          tzLabel: 'بتوقيتك المحلي'
        };
        
        userCard = buildCard(
          userLocationObj, weatherUser, prayersUser,
          LOCATIONS.aleppo.tzLabel, userSecondary
        );
      } catch (err) {
        userCard = `
          <div class="card">
            <div class="card-header">
              <div class="card-title">📍 موقعي الحالي</div>
            </div>
            <div class="error-box">تعذّر جلب بيانات موقعك: ${err.message}</div>
          </div>
        `;
      }
    } else {
      userCard = `
        <div class="card">
          <div class="card-header">
            <div class="card-title">📍 موقعي الحالي</div>
          </div>
          <div class="error-box">الرجاء السماح بالوصول إلى الموقع لعرض بطاقتك.</div>
        </div>
      `;
    }

    container.innerHTML = istanbulCard + aleppoCard + userCard;

  } catch (err) {
    container.innerHTML = `<div class="error-box">حدث خطأ: ${err.message}</div>`;
    console.error(err);
  }
}

// ============================================
// الإقلاع
// ============================================
async function init() {
  const container = document.getElementById('cardsContainer');
  container.innerHTML = '<div class="loading">⏳ جاري تحميل البيانات...</div>';

  try {
    userLocation = await getUserLocation();
  } catch (err) {
    console.warn('تعذّر الحصول على الموقع:', err.message);
    userLocation = null;
  }

  await renderApp();
  setInterval(renderApp, 60 * 1000);
}

document.addEventListener('DOMContentLoaded', init);