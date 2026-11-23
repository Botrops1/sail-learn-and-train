import './style.css';
import { builtInBoat, useBoat } from './model/boat';
import { startBoatId, storedBoats } from './app/boatStore';

// The boat is put in place before the app's modules are loaded (PHASE8_SPEC 16.3): several of them
// read the boat when they load. Nothing else is imported here.
const host = document.getElementById('app');
const id = startBoatId(window.location.search);
const builtIn = builtInBoat(id);
const profile = builtIn ? undefined : storedBoats().find((p) => p.id === id);
if (builtIn) useBoat(builtIn.id, builtIn.name, builtIn.data);
else if (profile) useBoat(profile.id, profile.name, profile.boat);
void import('./app/app')
  .then(({ startApp }) => {
    if (host) startApp(host, { missingBoat: !builtIn && !profile ? id : null });
  })
  .catch((error: unknown) => {
    console.error(error);
    if (host) host.textContent = 'The app could not load. Please reload the page.';
  });
