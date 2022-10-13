const API_KEY = "4087af702dac365cdb53b01baddf12b3";
const DAYS_OF_WEEK = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]
let selectedCityText, selectedCity;


// getting cities using geolocation
const getCitiesUsingGeoLocation = async (searchText) => {
    const response = await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${searchText}&limit=5&appid=${API_KEY}`)
    return response.json()
}


// getting current weather data

const getCurrentWeatherData = async ({lat, lon, name : city}) => {
    const url = lat && lon ? `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric` : `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric` ;

    const response = await fetch(url);
    return response.json()
}

// getting the hourly forecast

const getHourlyForecast = async ({ name: city }) => {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`)
    const data = await response.json()
    return data.list.map(forecast => {
        const { main: { temp, temp_max, temp_min }, dt, dt_txt, weather: [{ description, icon }] } = forecast;
        return { temp, temp_max, temp_min, dt, dt_txt, description, icon }
    })
}

// function to format temprature
const formatTemprature = (temp) => `${temp?.toFixed(1)}°c`


// function to create icons from url
const createIconUrl = (icon) => `http://openweathermap.org/img/wn/${icon}@2x.png`


// loading current forecast
const loadCurrentForecast = async ({ name, main: { temp, temp_max, temp_min }, weather: [{ description }] }) => {
    const currentForecastElement = document.querySelector("#current-forecast");
    currentForecastElement.querySelector(".city").textContent = name;
    currentForecastElement.querySelector(".temp").textContent = formatTemprature(temp);
    currentForecastElement.querySelector(".description").textContent = description;
    currentForecastElement.querySelector(".min-max-temp").textContent = `H: ${formatTemprature(temp_max)} L: ${formatTemprature(temp_min)}`;

}

// loading hourly forecast

const loadHourlyForecast = ({ main: { temp: tempNow }, weather: [{ icon: iconNow }] }, hourlyForecast) => {

    const timeFormatter = Intl.DateTimeFormat("en", {
        hour12: true, hour: "numeric"
    })  // Intl is time formatter 

    let dataFor12Hour = hourlyForecast.slice(2, 14);
    const hourlyContainer = document.querySelector(".hourly-container");
    let innerHTMLString = `<article>
    <h3 class="time">Now</h3>
    <img class="icon" src="${createIconUrl(iconNow)}" />
    <p class = "hourly-temp">${formatTemprature(tempNow)}</p>
    </article>`;

    for (let { temp, icon, dt_txt } of dataFor12Hour) {
        innerHTMLString += `<article>
          <h3 class="time">${timeFormatter.format(new Date(dt_txt))}</h3>
          <img class="icon" src="${createIconUrl(icon)}" />
          <p class = "hourly-temp">${formatTemprature(temp)}</p>
        </article>`
    }

    hourlyContainer.innerHTML = innerHTMLString;
}

// function to load feels like contents
const loadFeelsLike = ({ main: { feels_like } }) => {
    let container = document.querySelector("#feels-like")
    container.querySelector(".feels-like-temp").textContent = formatTemprature(feels_like)
}

// function to calculate the day wise weather forecast

const calculateDayWiseForecast = (hourlyForecast) => {
    let dayWiseForecast = new Map()

    for (let forecast of hourlyForecast) {
        const [date] = forecast.dt_txt.split(" ")
        const daysOfTheWeek = DAYS_OF_WEEK[new Date(date).getDay()]

        if (dayWiseForecast.has(daysOfTheWeek)) {
            let forecastForTheDay = dayWiseForecast.get(daysOfTheWeek)
            forecastForTheDay.push(forecast)
            dayWiseForecast.set(daysOfTheWeek, forecastForTheDay)
        } else {
            dayWiseForecast.set(daysOfTheWeek, [forecast])
        }
    }

    for (let [key, value] of dayWiseForecast) {
        let temp_min = Math.min(...Array.from(value, val => val.temp_min))
        let temp_max = Math.max(...Array.from(value, val => val.temp_max))

        dayWiseForecast.set(key, { temp_min, temp_max, icon: value.find(v => v.icon).icon })
    }

    return dayWiseForecast;
}

// loading the five day forecast

const loadFiveDayForecast = (hourlyForecast) => {
    const dayWiseForecast = calculateDayWiseForecast(hourlyForecast);
    const container = document.querySelector(".five-day-forecast-container");
    let dayWiseInfo = '';
    Array.from(dayWiseForecast).map(([day, { temp_min, temp_max, icon }], index) => {

        if (index < 5) {
            dayWiseInfo += `<article class="day-wise-forecast">
             <h3 class= "day">${index === 0 ? "Today" : day}</h3>
             <img class= "icon" src="${createIconUrl(icon)}" alt="icon for forecast">
             <p class="min-temp">${formatTemprature(temp_min)}</p>
             <p class="max-temp">${formatTemprature(temp_max)}</p>
            </article>`
        }
    })

    container.innerHTML = dayWiseInfo

}


// function to load humidity content
const loadHumidity = ({ main: { humidity } }) => {
    let container = document.querySelector("#humidity")
    container.querySelector(".humidity-value").textContent = `${humidity}%`

}


// function to show user the weather of his city

const loadForecastUsingGeoLocation = () => {
    navigator.geolocation.getCurrentPosition(({coords}) => {
       const {latitude : lat, longitude : lon} = coords 
       selectedCity = {lat, lon}
       loadData()
    }, error => console.log(error))
}


// function to load all the data

const loadData = async () => {
    const currentWeather = await getCurrentWeatherData(selectedCity);
    loadCurrentForecast(currentWeather);
    const hourlyForecast = await getHourlyForecast(currentWeather);
    loadHourlyForecast(currentWeather, hourlyForecast);
    loadFiveDayForecast(hourlyForecast)
    loadFeelsLike(currentWeather);
    loadHumidity(currentWeather);
}

// when we type something a request is being sent, we want to delay that request the functions below does that
function debounce(func) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            console.log("debounce");
            func.apply(this, args)
        }, 500);
    }
}

const onSearchChange = async (event) => {
    let { value } = event.target;
    
    if(!value) {
        selectedCity = null;
        selectedCityText = "";
    }

    if (value && selectedCityText !== value) {
        const listOfCities = await getCitiesUsingGeoLocation(value);
        let options = ""
        for (let { lat, lon, name, state, country } of listOfCities) {
            options += `<option data-city-details ='${JSON.stringify({ lat, lon, name })}' value="${name},${state},${country}"></option>`
        }
        document.querySelector("#cities").innerHTML = options
        
    }
}

const debounceSearch = debounce((event) => onSearchChange(event))


// function to handle city selection
const handleCitySelection = (event) => {
    selectedCityText = event.target.value
    let options = document.querySelectorAll("#cities > option");
    if (options?.length) {
        let selectedOption = Array.from(options).find(opt => opt.value === selectedCityText);
        selectedCity = JSON.parse(selectedOption.getAttribute("data-city-details"))
        console.log(selectedCity);
        loadData()
    }
}




// main function which executes upon loading 
document.addEventListener("DOMContentLoaded", async () => {

    loadForecastUsingGeoLocation()
    const searchInput = document.querySelector("#search");
    searchInput.addEventListener("input", debounceSearch);
    searchInput.addEventListener("change", handleCitySelection)

})