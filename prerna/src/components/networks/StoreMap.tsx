"use client";

import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon not showing
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface StoreMapProps {
  lat: number;
  lng: number;
  name?: string;
  address?: string;
}

export function StoreMap({ lat, lng, name, address }: StoreMapProps) {
  return (
    <MapContainer center={[lat, lng]} zoom={15} style={{ height: '250px', width: '100%', borderRadius: 12 }} scrollWheelZoom={false} dragging={true}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker position={[lat, lng]}>
        <Popup>
          <div>
            <strong>{name}</strong><br />
            {address}
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}
