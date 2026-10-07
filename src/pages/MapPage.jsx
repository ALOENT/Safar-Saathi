import React from 'react'
import { MapPin, Navigation, Layers } from 'lucide-react'

export const MapPage = () => {
  return (
    <div className="pb-safe max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-950 rounded-xl text-emerald-400 border border-emerald-800">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Interactive Safe Map</h2>
            <p className="text-xs text-slate-400">Leaflet + OpenStreetMap Integration</p>
          </div>
        </div>
        <button
          onClick={() => alert('Geolocation location capture integrated in Stage 3')}
          className="p-2 bg-emerald-900 text-emerald-300 rounded-xl border border-emerald-700/60"
        >
          <Navigation className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl h-80 flex flex-col items-center justify-center text-center p-6 space-y-3 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <MapPin className="w-10 h-10 text-emerald-400 animate-bounce" />
        <div>
          <p className="text-sm font-semibold text-white">Map Container Placeholder</p>
          <p className="text-xs text-slate-400 max-w-xs mt-1">
            Realtime GPS map, group markers, and geofence tracking will be connected in Stage 3 & 4.
          </p>
        </div>
      </div>
    </div>
  )
}
