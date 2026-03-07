// F1 Fantasy League 2026 — Data Configuration

// === CONSTRUCTORS (2026 Grid) ===
export const CONSTRUCTORS = {
  mclaren:     { name: 'McLaren',        color: '#FF8000', drivers: ['norris', 'piastri'] },
  ferrari:     { name: 'Ferrari',        color: '#E8002D', drivers: ['hamilton', 'leclerc'] },
  redbull:     { name: 'Red Bull Racing',color: '#3671C6', drivers: ['verstappen', 'hadjar'] },
  mercedes:    { name: 'Mercedes',       color: '#27F4D2', drivers: ['russell', 'antonelli'] },
  astonmartin: { name: 'Aston Martin',   color: '#229971', drivers: ['alonso', 'stroll'] },
  williams:    { name: 'Williams',       color: '#64C4FF', drivers: ['albon', 'sainz'] },
  alpine:      { name: 'Alpine',         color: '#FF87BC', drivers: ['gasly', 'colapinto'] },
  haas:        { name: 'Haas',           color: '#B6BABD', drivers: ['ocon', 'bearman'] },
  rb:          { name: 'Racing Bulls',   color: '#6692FF', drivers: ['lawson', 'lindblad'] },
  sauber:      { name: 'Audi',            color: '#52E252', drivers: ['hulkenberg', 'bortoletto'] },
  cadillac:    { name: 'Cadillac',       color: '#C0C0C0', drivers: ['bottas', 'perez'] },
};

// === DRIVERS ===
export const DRIVERS = {
  norris:      { name: 'Lando Norris',        short: 'NOR', number: 4,  constructor: 'mclaren' },
  piastri:     { name: 'Oscar Piastri',       short: 'PIA', number: 81, constructor: 'mclaren' },
  hamilton:    { name: 'Lewis Hamilton',       short: 'HAM', number: 44, constructor: 'ferrari' },
  leclerc:     { name: 'Charles Leclerc',      short: 'LEC', number: 16, constructor: 'ferrari' },
  verstappen:  { name: 'Max Verstappen',       short: 'VER', number: 1,  constructor: 'redbull' },
  hadjar:      { name: 'Isack Hadjar',         short: 'HAD', number: 20, constructor: 'redbull' },
  russell:     { name: 'George Russell',       short: 'RUS', number: 63, constructor: 'mercedes' },
  antonelli:   { name: 'Kimi Antonelli',       short: 'ANT', number: 12, constructor: 'mercedes' },
  alonso:      { name: 'Fernando Alonso',      short: 'ALO', number: 14, constructor: 'astonmartin' },
  stroll:      { name: 'Lance Stroll',         short: 'STR', number: 18, constructor: 'astonmartin' },
  albon:       { name: 'Alex Albon',           short: 'ALB', number: 23, constructor: 'williams' },
  sainz:       { name: 'Carlos Sainz',         short: 'SAI', number: 55, constructor: 'williams' },
  gasly:       { name: 'Pierre Gasly',         short: 'GAS', number: 10, constructor: 'alpine' },
  colapinto:   { name: 'Franco Colapinto',     short: 'COL', number: 43, constructor: 'alpine' },
  ocon:        { name: 'Esteban Ocon',         short: 'OCO', number: 31, constructor: 'haas' },
  bearman:     { name: 'Oliver Bearman',       short: 'BEA', number: 87, constructor: 'haas' },
  lawson:      { name: 'Liam Lawson',          short: 'LAW', number: 30, constructor: 'rb' },
  lindblad:    { name: 'Arvid Lindblad',       short: 'LIN', number: 2,  constructor: 'rb' },
  hulkenberg:  { name: 'Nico Hulkenberg',      short: 'HUL', number: 27, constructor: 'sauber' },
  bortoletto:  { name: 'Gabriel Bortoletto',   short: 'BOR', number: 5,  constructor: 'sauber' },
  bottas:      { name: 'Valtteri Bottas',      short: 'BOT', number: 77, constructor: 'cadillac' },
  perez:       { name: 'Sergio Perez',         short: 'PER', number: 11, constructor: 'cadillac' },
};

// === FANTASY TEAMS ===
export const FANTASY_TEAMS = {
  gray: {
    name: 'Gray',
    color: '#8B95A5',
    gradient: 'linear-gradient(135deg, #6B7280, #9CA3AF)',
    drivers: ['norris', 'hamilton', 'sainz', 'bottas', 'bortoletto'],
  },
  wes: {
    name: 'Wes',
    color: '#3B82F6',
    gradient: 'linear-gradient(135deg, #2563EB, #60A5FA)',
    drivers: ['russell', 'leclerc', 'lindblad', 'hulkenberg', 'bearman'],
  },
  hayes: {
    name: 'Hayes',
    color: '#10B981',
    gradient: 'linear-gradient(135deg, #059669, #34D399)',
    drivers: ['verstappen', 'hadjar', 'colapinto', 'gasly', 'ocon'],
  },
  conner: {
    name: 'Conner',
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #D97706, #FBBF24)',
    drivers: ['piastri', 'antonelli', 'albon', 'lawson', 'alonso'],
  },
};

// === SCORING RULES ===
export const SCORING = {
  qualifying: { 1: 10, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 1 },
  race:       { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 },
  sprint:     { 1: 8, 2: 7, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1 },
  fastestLap: 10,
  driverOfTheDay: 3,
  dnf: -10,
  fastestPitStop: 5,
  driverChampion: 25,
  constructorChampion: 50,
};

// === 2026 RACE CALENDAR ===
export const CALENDAR = [
  { round: 1,  name: 'Australian Grand Prix',      location: 'Melbourne',     circuit: 'Albert Park',              date: '2026-03-08', sprint: false },
  { round: 2,  name: 'Chinese Grand Prix',          location: 'Shanghai',      circuit: 'Shanghai International',   date: '2026-03-22', sprint: true },
  { round: 3,  name: 'Japanese Grand Prix',          location: 'Suzuka',        circuit: 'Suzuka Circuit',           date: '2026-04-05', sprint: false },
  { round: 4,  name: 'Bahrain Grand Prix',           location: 'Sakhir',        circuit: 'Bahrain International',    date: '2026-04-12', sprint: false },
  { round: 5,  name: 'Saudi Arabian Grand Prix',     location: 'Jeddah',        circuit: 'Jeddah Corniche',          date: '2026-04-19', sprint: true },
  { round: 6,  name: 'Miami Grand Prix',             location: 'Miami',         circuit: 'Miami International',      date: '2026-05-03', sprint: true },
  { round: 7,  name: 'Emilia Romagna Grand Prix',    location: 'Imola',         circuit: 'Autodromo Enzo e Dino',    date: '2026-05-17', sprint: false },
  { round: 8,  name: 'Monaco Grand Prix',            location: 'Monte Carlo',   circuit: 'Circuit de Monaco',        date: '2026-05-24', sprint: false },
  { round: 9,  name: 'Spanish Grand Prix',           location: 'Barcelona',     circuit: 'Circuit de Barcelona',     date: '2026-05-31', sprint: false },
  { round: 10, name: 'Canadian Grand Prix',          location: 'Montreal',      circuit: 'Circuit Gilles Villeneuve',date: '2026-06-14', sprint: false },
  { round: 11, name: 'Austrian Grand Prix',          location: 'Spielberg',     circuit: 'Red Bull Ring',            date: '2026-06-28', sprint: false },
  { round: 12, name: 'British Grand Prix',           location: 'Silverstone',   circuit: 'Silverstone Circuit',      date: '2026-07-05', sprint: false },
  { round: 13, name: 'Belgian Grand Prix',           location: 'Spa',           circuit: 'Circuit de Spa',           date: '2026-07-26', sprint: true },
  { round: 14, name: 'Hungarian Grand Prix',         location: 'Budapest',      circuit: 'Hungaroring',              date: '2026-08-02', sprint: false },
  { round: 15, name: 'Dutch Grand Prix',             location: 'Zandvoort',     circuit: 'CM.com Circuit',           date: '2026-08-30', sprint: false },
  { round: 16, name: 'Italian Grand Prix',           location: 'Monza',         circuit: 'Autodromo di Monza',       date: '2026-09-06', sprint: false },
  { round: 17, name: 'Azerbaijan Grand Prix',        location: 'Baku',          circuit: 'Baku City Circuit',        date: '2026-09-20', sprint: false },
  { round: 18, name: 'Singapore Grand Prix',         location: 'Singapore',     circuit: 'Marina Bay',               date: '2026-10-04', sprint: false },
  { round: 19, name: 'United States Grand Prix',     location: 'Austin',        circuit: 'COTA',                     date: '2026-10-18', sprint: true },
  { round: 20, name: 'Mexico City Grand Prix',       location: 'Mexico City',   circuit: 'Autódromo Hermanos R.',    date: '2026-10-25', sprint: false },
  { round: 21, name: 'São Paulo Grand Prix',         location: 'São Paulo',     circuit: 'Interlagos',               date: '2026-11-08', sprint: true },
  { round: 22, name: 'Las Vegas Grand Prix',         location: 'Las Vegas',     circuit: 'Las Vegas Strip',          date: '2026-11-21', sprint: false },
  { round: 23, name: 'Qatar Grand Prix',             location: 'Lusail',        circuit: 'Lusail International',     date: '2026-11-29', sprint: false },
  { round: 24, name: 'Abu Dhabi Grand Prix',         location: 'Abu Dhabi',     circuit: 'Yas Marina',               date: '2026-12-06', sprint: false },
];

// === RACE RESULTS ===
// Auto-updated by scripts/fetch-results.mjs via GitHub Actions.
// Do not edit manually — changes will be overwritten.
import RESULTS_DATA from './results.json';
export const RESULTS = RESULTS_DATA;
