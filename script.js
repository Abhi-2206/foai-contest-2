// Dashboard Configuration
const HF_TOKEN = window.__HF_TOKEN__ || "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";

// Global State
let weatherData = { temperature: 0, windspeed: 0 };
let currencyData = { INR: 0, EUR: 0, GBP: 0 };
let citizenData = { name: "", city: "", email: "" };
let factData = { text: "" };
let lastWeatherFetch = null;

/**
 * API Fetchers
 */

async function fetchWeather() {
    toggleLoading('card-weather', true);
    try {
        const res = await fetch("https://wttr.in/Pune?format=j1");
        if (!res.ok) throw new Error("Fetch failed");

        const data = await res.json();
        const current = data.current_condition[0];

        weatherData = {
            temperature: current.temp_C,
            windspeed: current.windspeedKmph,
            weathercode: current.weatherCode,
            feelslike: current.FeelsLikeC,
            humidity: current.humidity,
            description: current.weatherDesc[0].value
        };

        document.getElementById('weather-temp').innerText = `${weatherData.temperature}°C`;
        document.getElementById('weather-wind').innerHTML = `
            Wind: ${weatherData.windspeed} km/h<br>
            ${weatherData.description}<br>
            <span style="font-size: 0.8em; opacity: 0.8;">Feels like: ${weatherData.feelslike}°C</span>
        `;
        document.getElementById('weather-error').style.display = 'none';
    } catch (err) {
        document.getElementById('weather-error').innerText = "Weather Service Offline";
        document.getElementById('weather-error').style.display = 'block';
    } finally {
        toggleLoading('card-weather', false);
    }
}

async function fetchCurrency() {
    toggleLoading('card-currency', true);
    try {
        const res = await fetch("https://open.er-api.com/v6/latest/USD");
        const data = await res.json();
        if (data && data.rates) {
            currencyData = data.rates;
            document.getElementById('curr-inr').innerText = `₹ ${currencyData.INR.toLocaleString()} INR`;
            document.getElementById('curr-eur').innerText = `€ ${currencyData.EUR.toLocaleString()} EUR`;
            document.getElementById('curr-gbp').innerText = `£ ${currencyData.GBP.toLocaleString()} GBP`;
            document.getElementById('curr-error').style.display = 'none';
        }
    } catch (err) {
        document.getElementById('curr-error').style.display = 'block';
    } finally {
        toggleLoading('card-currency', false);
    }
}

async function fetchCitizen() {
    toggleLoading('card-profile', true);
    try {
        // Direct fetch from randomuser.me (Supports CORS natively on production domains)
        const res = await fetch("https://randomuser.me/api/?nat=us&inc=name,location,email,picture");
        if (!res.ok) throw new Error("API Offline");
        
        const data = await res.json();
        const person = data.results[0];

        citizenData = {
            name: `${person.name.first} ${person.name.last}`,
            city: person.location.city,
            email: person.email,
            pic: person.picture.large
        };

        document.getElementById('citizen-name').innerText = citizenData.name;
        document.getElementById('citizen-city').innerText = citizenData.city;
        document.getElementById('citizen-email').innerText = citizenData.email;
        const img = document.getElementById('citizen-img');
        if (img) {
            img.src = citizenData.pic;
            img.style.display = 'block';
        }
        document.getElementById('profile-error').style.display = 'none';
    } catch (err) {
        console.error("Citizen logic failed:", err);
        document.getElementById('profile-error').style.display = 'block';
    } finally {
        toggleLoading('card-profile', false);
    }
}

async function fetchFact() {
    toggleLoading('card-fact', true);
    try {
        // Direct fetch from uselessfacts.jsph.pl (supports CORS natively)
        const target = "https://uselessfacts.jsph.pl/api/v2/facts/random?language=en";
        const res = await fetch(target);
        if (!res.ok) throw new Error("Fact API Error");
        
        const data = await res.json();
        
        if (data && data.text) {
            factData = { text: data.text };
            document.getElementById('fact-body').innerText = factData.text;
            document.getElementById('fact-error').style.display = 'none';
        }
    } catch (err) {
        console.error("Fact Fetch Error:", err);
        document.getElementById('fact-body').innerText = "Fact database momentarily disconnected.";
        document.getElementById('fact-error').style.display = 'block';
    } finally {
        toggleLoading('card-fact', false);
    }
}

/**
 * UI Utilities
 */

function toggleLoading(cardId, isLoading) {
    const card = document.getElementById(cardId);
    if (!card) return;
    if (isLoading) card.classList.add('is-loading');
    else card.classList.remove('is-loading');
}

function toggleChat() {
    const win = document.getElementById('chat-window');
    const chatIcon = document.getElementById('chat-icon');
    const closeIcon = document.getElementById('close-icon');

    win.classList.toggle('open');
    if (win.classList.contains('open')) {
        chatIcon.style.display = 'none';
        closeIcon.style.display = 'block';
        document.getElementById('user-input').focus();
    } else {
        chatIcon.style.display = 'block';
        closeIcon.style.display = 'none';
    }
}

function scrollToBottom() {
    const box = document.getElementById('chat-messages');
    box.scrollTop = box.scrollHeight;
}

function appendMessage(role, text) {
    const box = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `msg msg-${role}`;
    div.innerText = text;
    box.appendChild(div);
    scrollToBottom();
    return div;
}

function appendLoadingMessage() {
    const box = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `msg msg-ai`;
    div.innerText = "Thinking... please wait a moment.";
    box.appendChild(div);
    scrollToBottom();
    return div;
}

/**
 * AI & Chat Messaging
 */

async function sendMessage() {
    const input = document.getElementById('user-input');
    const question = input.value.trim();
    const btn = document.getElementById('send-btn');

    if (!question) return;

    // Using the hardcoded token and trimming to remove hidden whitespace
    const CLEAN_TOKEN = HF_TOKEN.trim();

    appendMessage("user", question);
    input.value = "";
    btn.disabled = true;

    const liveContext = `You are a helpful SmartCity assistant.
Answer only based on this live dashboard data:
WEATHER: Temp ${weatherData.temperature}°C, Wind ${weatherData.windspeed} km/h
CURRENCY: 1 USD = ${currencyData.INR} INR, ${currencyData.EUR} EUR, ${currencyData.GBP} GBP
CITIZEN: ${citizenData.name}, from ${citizenData.city}, email: ${citizenData.email}
CITY FACT: ${factData.text}
If asked anything outside this data, politely decline.`;

    const aiBubble = appendLoadingMessage();

    try {
        const response = await fetch(
            "https://corsproxy.io/?" + encodeURIComponent("https://api-inference.huggingface.co/models/meta-llama/Llama-3.2-3B-Instruct"),
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${CLEAN_TOKEN}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    inputs: `Context: ${liveContext}\n\nQuestion: ${question}`,
                    parameters: {
                        max_new_tokens: 500,
                        return_full_text: false
                    }
                }),
            }
        );

        if (response.status === 401) {
            throw new Error("Invalid API Token. Please check your Hugging Face Token (starts with hf_).");
        }

        if (response.status === 503) {
            aiBubble.innerText = "Model is currently loading... Please wait a few seconds and try again.";
            return;
        }

        const result = await response.json();

        if (result.error) {
            aiBubble.innerText = `AI Error: ${result.error.message || JSON.stringify(result.error)}`;
            return;
        }

        // Standard Inference API response is an array or object depending on model
        let botReply = "";
        if (Array.isArray(result)) {
            botReply = result[0].generated_text || result[0].summary_text || "";
        } else if (result.generated_text) {
            botReply = result.generated_text;
        }

        aiBubble.innerText = botReply.trim() || "Sorry, I could not get a response.";

    } catch (err) {
        console.error("AI Error:", err);
        let msg = err.message;
        if (msg === "Failed to fetch") msg = "Network Error or CORS Blocked. Please check your internet and API endpoint.";
        aiBubble.innerText = msg || "AI is currently unavailable. Please try again in a moment.";
        aiBubble.style.color = "#fb7185";
    } finally {
        btn.disabled = false;
        scrollToBottom();
    }
}

// Global initialization - Staggered to prevent 429 Errors
window.onload = () => {
    setTimeout(fetchWeather, 0);      // Load immediately
    setTimeout(fetchCurrency, 500);   // Wait 0.5s
    setTimeout(fetchCitizen, 1000);   // Wait 1.0s
    setTimeout(fetchFact, 1500);      // Wait 1.5s
};
