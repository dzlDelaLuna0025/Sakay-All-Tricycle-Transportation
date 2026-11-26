import React from 'react';

const points = [
  { name: 'Estancia', x: 105, y: 105 },
  { name: 'Mabilo', x: 400, y: 85 },
  { name: 'Poblacion, Kalibo', shortName: 'Poblacion', x: 295, y: 210 },
  { name: 'New Buswang', shortName: 'New Buswang', x: 465, y: 265 },
  { name: 'Pook', x: 125, y: 285 },
  { name: 'Mobo', x: 260, y: 355 },
];

function MapView({ pickup, destination }) {
  return (
    <div className="map-card">
      <div className="map-heading">
        <div>
          <span className="eyebrow">ROUTE PREVIEW</span>
          <h3>Kalibo service areas</h3>
        </div>
        <span className="simulation-badge">Illustrative map</span>
      </div>
      <svg className="local-map" viewBox="0 0 570 420" role="img" aria-label="Illustrative map of the six supported Kalibo locations">
        <path className="map-river" d="M-20 335 C105 250, 160 340, 265 240 S430 105, 600 150" />
        <path className="map-road major" d="M45 75 C180 120, 265 165, 305 220 S410 315, 535 350" />
        <path className="map-road" d="M105 105 L295 210 L400 85 M295 210 L465 265 M295 210 L125 285 L260 355 L465 265" />
        <path className="map-road minor" d="M20 205 C155 165, 225 120, 400 85 M125 285 C250 275, 370 320, 540 275" />
        {points.map((point) => {
          const isPickup = pickup === point.name;
          const isDestination = destination === point.name;
          const selected = isPickup || isDestination;
          return (
            <g key={point.name} className={`map-point ${selected ? 'selected' : ''}`}>
              {selected && <circle className={isPickup ? 'point-ring pickup' : 'point-ring destination'} cx={point.x} cy={point.y} r="19" />}
              <circle className={isPickup ? 'point-dot pickup' : isDestination ? 'point-dot destination' : 'point-dot'} cx={point.x} cy={point.y} r={selected ? 9 : 6} />
              <text x={point.x} y={point.y - 18} textAnchor="middle">{point.shortName || point.name}</text>
            </g>
          );
        })}
      </svg>
      <div className="map-legend">
        <span><i className="legend-dot pickup" /> Pickup</span>
        <span><i className="legend-dot destination" /> Destination</span>
        <small>No live GPS tracking</small>
      </div>
    </div>
  );
}

export default MapView;
