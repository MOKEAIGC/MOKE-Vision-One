// 文件路径: components/EarthView.tsx
import React, { useRef, useState, useEffect } from 'react';
import Map, { MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Search, Keyboard, Navigation } from 'lucide-react';
import { useTextShortcuts } from './useTextShortcuts';

interface EarthViewProps {
  onCapture: (imageDataUrl: string) => void;
  isDark: boolean;
}

export const EarthView: React.FC<EarthViewProps> = ({ onCapture, isDark }) => {
  const mapRef = useRef<MapRef>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const inputShortcuts = useTextShortcuts();

  const [viewState, setViewState] = useState({
    longitude: 139.6503,
    latitude: 35.6762,
    zoom: 13,
    pitch: 60, // Default to 3D pitch
    bearing: 0
  });

  // Middle mouse button rotation state
  const [isMiddleClickDragging, setIsMiddleClickDragging] = useState(false);
  const dragStartRef = useRef<{ x: number, y: number, pitch: number, bearing: number } | null>(null);

  const formatCoord = (val: number, isLat: boolean) => {
    const dir = isLat ? (val >= 0 ? 'N' : 'S') : (val >= 0 ? 'E' : 'W');
    return `${Math.abs(val).toFixed(4)}° ${dir}`;
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isMiddleClickDragging && dragStartRef.current) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        
        const newBearing = dragStartRef.current.bearing + dx * 0.5;
        const newPitch = Math.max(0, Math.min(85, dragStartRef.current.pitch - dy * 0.5));
        
        setViewState(prev => ({
          ...prev,
          bearing: newBearing,
          pitch: newPitch
        }));
      }
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (e.button === 1) {
        setIsMiddleClickDragging(false);
        dragStartRef.current = null;
        document.body.style.cursor = 'default';
      }
    };

    if (isMiddleClickDragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      document.body.style.cursor = 'grabbing';
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      document.body.style.cursor = 'default';
    };
  }, [isMiddleClickDragging]);

  const handleMouseDown = (e: any) => {
    if (e.originalEvent.button === 1) { // Middle click
      setIsMiddleClickDragging(true);
      dragStartRef.current = {
        x: e.originalEvent.clientX,
        y: e.originalEvent.clientY,
        pitch: viewState.pitch,
        bearing: viewState.bearing
      };
      e.originalEvent.preventDefault();
    }
  };

  // Keyboard controls for smooth navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 当焦点在任何文本输入元素中时，不处理全局键盘快捷键
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (document.activeElement as HTMLElement)?.isContentEditable) return;

      setViewState(prev => {
        // Scale movement speed based on current zoom level
        const moveStep = 0.05 / Math.pow(2, Math.max(1, prev.zoom - 10)); 
        const pitchStep = 5;
        const bearingStep = 5;
        
        let { longitude, latitude, pitch, bearing, zoom } = prev;
        const bearingRad = (bearing * Math.PI) / 180;

        let changed = true;

        switch (e.key.toLowerCase()) {
          case 'w':
          case 'arrowup':
            if (e.shiftKey) {
              pitch = Math.max(0, pitch - pitchStep);
            } else {
              longitude += moveStep * Math.sin(bearingRad);
              latitude += moveStep * Math.cos(bearingRad);
            }
            break;
          case 's':
          case 'arrowdown':
            if (e.shiftKey) {
              pitch = Math.min(85, pitch + pitchStep);
            } else {
              longitude -= moveStep * Math.sin(bearingRad);
              latitude -= moveStep * Math.cos(bearingRad);
            }
            break;
          case 'a':
          case 'arrowleft':
            if (e.shiftKey) {
              bearing -= bearingStep;
            } else {
              longitude -= moveStep * Math.cos(bearingRad);
              latitude += moveStep * Math.sin(bearingRad);
            }
            break;
          case 'd':
          case 'arrowright':
            if (e.shiftKey) {
              bearing += bearingStep;
            } else {
              longitude += moveStep * Math.cos(bearingRad);
              latitude -= moveStep * Math.sin(bearingRad);
            }
            break;
          case 'q':
            bearing -= bearingStep;
            break;
          case 'e':
            bearing += bearingStep;
            break;
          case '=':
          case '+':
            zoom = Math.min(22, zoom + 0.5);
            break;
          case '-':
          case '_':
            zoom = Math.max(0, zoom - 0.5);
            break;
          default:
            changed = false;
            break;
        }
        
        if (changed) {
          e.preventDefault();
          return { ...prev, longitude, latitude, pitch, bearing, zoom };
        }
        return prev;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        mapRef.current?.flyTo({
          center: [parseFloat(data[0].lon), parseFloat(data[0].lat)],
          zoom: 15,
          pitch: 60,
          duration: 2000
        });
      } else {
        alert('LOCATION NOT FOUND');
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCapture = async () => {
    if (!mapRef.current) return;
    setIsCapturing(true);
    try {
      const map = mapRef.current.getMap();
      
      // Force a repaint and capture immediately after render
      // This avoids the black image issue caused by WebGL buffer clearing
      map.once('render', () => {
        setTimeout(() => {
          try {
            const canvas = map.getCanvas();
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            onCapture(dataUrl);
          } catch (err) {
            console.error('Failed to capture earth view during render:', err);
            alert('SATELLITE LINK FAILED // CANNOT CAPTURE');
          } finally {
            setIsCapturing(false);
          }
        }, 100); // Small delay to ensure WebGL buffer is ready
      });
      map.triggerRepaint();
    } catch (error) {
      console.error('Failed to initiate earth view capture:', error);
      alert('SATELLITE LINK FAILED // CANNOT CAPTURE');
      setIsCapturing(false);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-black">
      {/* Top Bar */}
      <div className={`absolute top-0 left-0 right-0 p-4 z-[400] flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent pointer-events-none`}>
        <div className="flex flex-col gap-2">
          <div className="font-mono text-xs text-moke-red tracking-[0.2em] font-bold uppercase drop-shadow-md">
            SATELLITE UPLINK ACTIVE [3D TERRAIN]
          </div>
          {showControls && (
            <div className="font-mono text-[10px] text-white/70 bg-black/50 p-2 rounded-sm border border-white/10 backdrop-blur-sm pointer-events-auto">
              <div className="flex items-center gap-2 mb-1 text-moke-red">
                <Keyboard size={12} />
                <span>FLIGHT CONTROLS</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <span>W/A/S/D</span><span className="text-white/40">PAN CAMERA</span>
                <span>Q/E</span><span className="text-white/40">ROTATE</span>
                <span>SHIFT + W/S</span><span className="text-white/40">TILT UP/DOWN</span>
                <span>+ / -</span><span className="text-white/40">ZOOM IN/OUT</span>
                <span>MIDDLE CLICK</span><span className="text-white/40">DRAG TO ROTATE/TILT</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Search Box */}
        <form onSubmit={handleSearch} className="pointer-events-auto flex items-center gap-2">
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={inputShortcuts.onKeyDown}
            placeholder="ENTER COORDINATES OR LOCATION..."
            className="bg-black/50 border border-moke-red/50 text-white font-mono text-xs px-3 py-1.5 rounded-sm outline-none focus:border-moke-red backdrop-blur-md w-64 uppercase placeholder:text-gray-500"
          />
          <button 
            type="submit" 
            disabled={isSearching}
            className="bg-moke-red/20 border border-moke-red/50 text-moke-red p-1.5 rounded-sm hover:bg-moke-red hover:text-white transition-colors"
          >
            <Search size={14} />
          </button>
        </form>
      </div>

      {/* Map Container */}
      <div className="flex-1 w-full h-full relative z-0">
        <Map
          ref={mapRef}
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          onMouseDown={handleMouseDown}
          mapStyle={{
            version: 8,
            sources: {
              satellite: {
                type: 'raster',
                tiles: [
                  'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
                ],
                tileSize: 256,
                attribution: 'Google'
              },
              terrain: {
                type: 'raster-dem',
                tiles: [
                  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
                ],
                encoding: 'terrarium',
                tileSize: 256,
                maxzoom: 15
              },
              openfreemap: {
                type: 'vector',
                url: 'https://tiles.openfreemap.org/planet'
              }
            },
            layers: [
              {
                id: 'satellite-layer',
                type: 'raster',
                source: 'satellite',
                minzoom: 0,
                maxzoom: 22
              },
              {
                id: '3d-buildings',
                source: 'openfreemap',
                'source-layer': 'building',
                type: 'fill-extrusion',
                minzoom: 14,
                paint: {
                  'fill-extrusion-color': '#e0e0e0',
                  'fill-extrusion-height': ['get', 'render_height'],
                  'fill-extrusion-base': ['get', 'render_min_height'],
                  'fill-extrusion-opacity': 0.7
                }
              }
            ],
            terrain: {
              source: 'terrain',
              exaggeration: 1.5
            }
          }}
          preserveDrawingBuffer={true}
          style={{ width: '100%', height: '100%' }}
          attributionControl={false}
          dragRotate={true}
          keyboard={false} // Disable default keyboard to use our custom smooth controls
        />
      </div>

      {/* Crosshair Overlay */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[400]">
        <div className="w-16 h-16 border border-moke-red/50 rounded-full flex items-center justify-center">
          <div className="w-1 h-1 bg-moke-red rounded-full"></div>
        </div>
        <div className="absolute w-full h-[1px] bg-moke-red/20"></div>
        <div className="absolute h-full w-[1px] bg-moke-red/20"></div>
      </div>

      {/* Left HUD: Coordinates & Compass */}
      <div className="absolute bottom-8 left-4 z-[400] flex flex-col gap-4 pointer-events-none">
        {/* Compass */}
        <div 
          className="w-12 h-12 bg-black/50 border border-moke-red/30 rounded-full flex items-center justify-center backdrop-blur-md pointer-events-auto cursor-pointer hover:bg-moke-red/20 transition-colors relative"
          onClick={() => setViewState(prev => ({ ...prev, bearing: 0, pitch: 0 }))}
          title="RESET NORTH"
        >
          <div 
            className="relative flex items-center justify-center w-full h-full"
            style={{ transform: `rotate(${-viewState.bearing}deg)`, transition: 'transform 0.1s ease-out' }}
          >
            <div className="absolute top-1 text-[8px] font-mono text-moke-red/70 font-bold">N</div>
            <Navigation 
              size={18} 
              className="text-moke-red mt-2"
              fill="currentColor"
            />
          </div>
        </div>

        {/* Coordinates */}
        <div className="bg-black/50 border border-moke-red/30 p-3 rounded-sm backdrop-blur-md font-mono text-[10px] text-moke-red/80 flex flex-col gap-1 tracking-wider">
          <div className="flex justify-between gap-4">
            <span>LAT</span>
            <span className="text-white">{formatCoord(viewState.latitude, true)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>LON</span>
            <span className="text-white">{formatCoord(viewState.longitude, false)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>ALT</span>
            <span className="text-white">{Math.round(viewState.zoom * 1000)} M</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>HDG</span>
            <span className="text-white">{Math.round((viewState.bearing + 360) % 360)}°</span>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[400] flex flex-col items-center gap-4">
        <div className="flex items-center gap-8">
          <button
            onClick={handleCapture}
            disabled={isCapturing}
            className={`pointer-events-auto group relative flex items-center justify-center w-16 h-16 rounded-full border-2 transition-all ${
              isCapturing 
                ? 'border-gray-600 bg-gray-800' 
                : 'border-moke-red bg-moke-red/10 hover:bg-moke-red hover:scale-105'
            }`}
          >
            <div className={`w-12 h-12 rounded-full transition-all ${
              isCapturing ? 'bg-gray-600' : 'bg-moke-red group-hover:scale-90'
            }`}></div>
          </button>
        </div>
        
        <div className="font-mono text-[10px] text-white/70 tracking-widest uppercase bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm pointer-events-none">
          {isCapturing ? 'CAPTURING...' : 'CAPTURE SATELLITE IMAGE'}
        </div>
      </div>
    </div>
  );
};
