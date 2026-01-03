#!/usr/bin/env python3
"""
Convert GeoJSON from EPSG:3067 (Finnish ETRS-TM35FIN) to EPSG:4326 (WGS84)
for use with Leaflet which expects WGS84 coordinates.
"""

import json
from pathlib import Path
from pyproj import Transformer

# Create transformer from EPSG:3067 to EPSG:4326
transformer = Transformer.from_crs("EPSG:3067", "EPSG:4326", always_xy=True)


def transform_coordinates(coords):
    """Recursively transform coordinates from EPSG:3067 to EPSG:4326"""
    if isinstance(coords[0], (int, float)):
        # This is a coordinate pair [x, y] or [x, y, z]
        x, y = coords[0], coords[1]
        lng, lat = transformer.transform(x, y)
        return [lng, lat] if len(coords) == 2 else [lng, lat, coords[2]]
    else:
        # This is a list of coordinates or nested structure
        return [transform_coordinates(c) for c in coords]


def transform_geometry(geometry):
    """Transform geometry coordinates"""
    if geometry is None:
        return None
    
    geom_type = geometry.get("type")
    coords = geometry.get("coordinates")
    
    if coords is None:
        return geometry
    
    transformed = {
        "type": geom_type,
        "coordinates": transform_coordinates(coords)
    }
    
    return transformed


def transform_geojson(input_path: Path, output_path: Path):
    """Transform entire GeoJSON file from EPSG:3067 to EPSG:4326"""
    
    print(f"Reading {input_path}...")
    with open(input_path, 'r', encoding='utf-8') as f:
        geojson = json.load(f)
    
    print(f"Transforming {len(geojson.get('features', []))} features...")
    
    # Transform each feature's geometry
    for feature in geojson.get("features", []):
        if "geometry" in feature:
            feature["geometry"] = transform_geometry(feature["geometry"])
    
    # Update CRS to WGS84
    geojson["crs"] = {
        "type": "name",
        "properties": {
            "name": "urn:ogc:def:crs:EPSG::4326"
        }
    }
    
    # Update bbox if present
    if "bbox" in geojson:
        min_x, min_y, max_x, max_y = geojson["bbox"][:4]
        min_lng, min_lat = transformer.transform(min_x, min_y)
        max_lng, max_lat = transformer.transform(max_x, max_y)
        geojson["bbox"] = [min_lng, min_lat, max_lng, max_lat]
    
    print(f"Writing transformed GeoJSON to {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, ensure_ascii=False)
    
    # Print sample coordinate for verification
    if geojson.get("features"):
        sample = geojson["features"][0]
        coords = sample["geometry"]["coordinates"]
        # Get first coordinate depending on geometry type
        while isinstance(coords[0], list):
            coords = coords[0]
        print(f"\nSample transformed coordinate: {coords}")
        print(f"Feature: {sample['properties'].get('nimi', 'Unknown')}")
    
    print("\nTransformation complete!")


if __name__ == "__main__":
    script_dir = Path(__file__).parent
    project_dir = script_dir.parent
    
    input_file = project_dir / "public" / "finland_municipalities.geojson"
    output_file = project_dir / "public" / "finland_municipalities_wgs84.geojson"
    
    transform_geojson(input_file, output_file)

