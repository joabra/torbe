"use client";
import { useEffect, useState } from "react";
import { Sun, Cloud, CloudRain, CloudSnow, Wind, Thermometer } from "lucide-react";

interface WeatherData {
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  humidity: number;
}

// WMO Weather Code interpretation
function describeWeather(code: number): { label: string; icon: React.ReactNode } {
  if (code === 0) return { label: "Klart", icon: <Sun className="w-5 h-5 text-amber-400" /> };
  if (code <= 3) return { label: "Halvklart", icon: <Cloud className="w-5 h-5 text-stone-400" /> };
  if (code <= 49) return { label: "Dimma", icon: <Cloud className="w-5 h-5 text-stone-400" /> };
  if (code <= 67) return { label: "Regn", icon: <CloudRain className="w-5 h-5 text-blue-400" /> };
  if (code <= 77) return { label: "Snö", icon: <CloudSnow className="w-5 h-5 text-sky-300" /> };
  if (code <= 82) return { label: "Regnskurar", icon: <CloudRain className="w-5 h-5 text-blue-400" /> };
  if (code <= 99) return { label: "Åska", icon: <CloudRain className="w-5 h-5 text-purple-400" /> };
  return { label: "Okänt", icon: <Sun className="w-5 h-5 text-amber-400" /> };
}

// Mil Palmeras, Costa Blanca: lat 37.85, lon -0.73
const LAT = 37.85;
const LON = -0.73;

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&wind_speed_unit=kmh&timezone=Europe%2FMadrid`
    )
      .then((r) => r.json())
      .then((data) => {
        setWeather({
          temperature: Math.round(data.current.temperature_2m),
          weatherCode: data.current.weather_code,
          windSpeed: Math.round(data.current.wind_speed_10m),
          humidity: data.current.relative_humidity_2m,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-5 py-2.5 text-white text-sm font-medium animate-pulse">
        <Thermometer className="w-4 h-4 text-sand-400" />
        <span className="text-white/60">Hämtar väder...</span>
      </div>
    );
  }

  if (!weather) return null;

  const { label, icon } = describeWeather(weather.weatherCode);

  return (
    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-5 py-2.5 text-white text-sm font-medium">
      {icon}
      <span>{weather.temperature}°C — {label}</span>
      <span className="text-white/60 hidden sm:inline">· {weather.windSpeed} km/h</span>
    </div>
  );
}
