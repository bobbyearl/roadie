# Auto Pilot Mode

## Concept

A driving companion mode that automatically shows cameras ahead of you based on your current location and direction of travel.

## Behavior

- New toolbar button (car icon) toggles Auto Pilot on/off
- When enabled:
  1. Requests current location (and continuous location updates)
  2. Determines direction of travel from location history (bearing between last N points)
  3. Shows the map centered on your position
  4. Automatically selects/displays the closest camera(s) in your direction of travel
  5. As you move, cameras rotate out and new ones ahead appear
- Location updates via `watchPosition` (browser Geolocation API) or polling `getCurrentPosition`
- Prefer `watchPosition` for smooth updates without polling overhead

## Direction of Travel

- Calculate bearing from last 2-3 GPS points
- Filter cameras within a forward cone (e.g., +/- 45 degrees from heading)
- Sort by distance, show closest 1-3 cameras ahead
- As user passes a camera, it drops off and the next one loads

## Nice-to-haves

- Traffic layer on the map (Google Maps Traffic Layer is one line: `new google.maps.TrafficLayer().setMap(map)`)
- Distance/ETA to next camera shown on screen
- Audio alert when approaching a camera with an incident nearby
- Lock screen / keep-alive to prevent phone from sleeping

## Safety

- Must show a driving safety warning/disclaimer when entering Auto Pilot mode
- "Do not interact with this device while driving" modal on activation
- Consider larger UI elements / minimal interaction design for this mode
- Maybe auto-enable after accepting the disclaimer (no second tap needed)

## Platform Notes

- Web: `navigator.geolocation.watchPosition` works but requires HTTPS and user permission
- PWA/native app: would get background location access, lock screen persistence
- This mode is the strongest case for making Roadie a real app (React Native or PWA)

## Priority

Future feature. Capture now, build later.
