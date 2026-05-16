import { query } from '../config/db.js';

const players = [
  { id: 'P001', name: 'Beer Guy', team: 'KC', projectedPoints: 95, adp: 1, description: 'Always brings the good stuff to parties. Never disappoints.' },
  { id: 'P002', name: 'Wine Wizard', team: 'CA', projectedPoints: 92, adp: 2, description: 'Knows all the best vineyards. Sommelier skills.' },
  { id: 'P003', name: 'Whiskey Wolf', team: 'KY', projectedPoints: 90, adp: 3, description: 'Premium bourbon collector. Always neat.' },
  { id: 'P004', name: 'Tequila Tornado', team: 'MX', projectedPoints: 88, adp: 4, description: 'Likes to party hard. Morning after is rough but worth it.' },
  { id: 'P005', name: 'Margarita Mike', team: 'TX', projectedPoints: 87, adp: 5, description: 'Makes the best margs this side of the border.' },
  { id: 'P006', name: 'Craft Beer Chris', team: 'OR', projectedPoints: 85, adp: 6, description: 'IPA enthusiast. Hops are life.' },
  { id: 'P007', name: 'Vodka Val', team: 'RU', projectedPoints: 84, adp: 7, description: 'Clean and efficient. Gets the job done.' },
  { id: 'P008', name: 'Rum Runner', team: 'PR', projectedPoints: 83, adp: 8, description: 'Tropical vibes only. Beach bum extraordinaire.' },
  { id: 'P009', name: 'Gin Giant', team: 'UK', projectedPoints: 82, adp: 9, description: 'For when you want to argue about nothing.' },
  { id: 'P010', name: 'Sake Samurai', team: 'JP', projectedPoints: 81, adp: 10, description: 'Rice wine master. Very smooth operator.' },
  { id: 'P011', name: 'Cider Sally', team: 'VT', projectedPoints: 80, adp: 11, description: 'Sweet and crispy. Fall favorite.' },
  { id: 'P012', name: 'Mead Master', team: 'ME', projectedPoints: 79, adp: 12, description: 'Honey wine pioneer. Ancient and wise.' },
  { id: 'P013', name: 'Champagne Charlie', team: 'FR', projectedPoints: 78, adp: 13, description: 'Celebrates everything. Very bubbly.' },
  { id: 'P014', name: 'Moscow Mule', team: 'RU', projectedPoints: 77, adp: 14, description: 'Ginger beer kick. Copper mug gang.' },
  { id: 'P015', name: 'Old Fashioned', team: 'KY', projectedPoints: 76, adp: 15, description: 'Classic approach. No chaser needed.' },
  { id: 'P016', name: 'Mojito Max', team: 'CU', projectedPoints: 75, adp: 16, description: 'Fresh mint and rum. Refreshingly smooth.' },
  { id: 'P017', name: 'Bloody Mary', team: 'MX', projectedPoints: 74, adp: 17, description: 'Brunch champion. Hair of the dog.' },
  { id: 'P018', name: 'Martini Mary', team: 'IT', projectedPoints: 73, adp: 18, description: 'Shaken not stirred. Classy as hell.' },
  { id: 'P019', name: 'Cosmopolitan', team: 'NY', projectedPoints: 72, adp: 19, description: 'Sex and the city vibes. Pink and proud.' },
  { id: 'P020', name: 'Long Island', team: 'NY', projectedPoints: 71, adp: 20, description: 'Dangerously tasty. Sips slowly.' },
  { id: 'P021', name: 'Jägerbomb Jay', team: 'DE', projectedPoints: 70, adp: 21, description: 'Energy drinkchaser. College legend.' },
  { id: 'P022', name: 'Shots Nora', team: 'NV', projectedPoints: 69, adp: 22, description: 'Round for the house. Never remembers.' },
  { id: 'P023', name: 'Keg Stand Ken', team: 'CA', projectedPoints: 68, adp: 23, description: 'Party anchor. Holds it down.' },
  { id: 'P024', name: 'Draft Dan', team: 'WI', projectedPoints: 67, adp: 24, description: 'Dives are his domain.' },
  { id: 'P025', name: 'Bar Tab Beth', team: 'FL', projectedPoints: 66, adp: 25, description: 'Always opens a tab. Very generous.' },
  { id: 'P026', name: 'Last Call Larry', team: 'NJ', projectedPoints: 65, adp: 26, description: 'Stays until they kick him out.' },
  { id: 'P027', name: 'Two Buck Chuck', team: 'CA', projectedPoints: 64, adp: 27, description: 'Budget boozer. Trader Joe\'s king.' },
  { id: 'P028', name: 'Karaoke Krissy', team: 'KR', projectedPoints: 63, adp: 28, description: 'Sings after every shot. Terrible but brave.' },
  { id: 'P029', name: 'Beer Pong Brad', team: 'PA', projectedPoints: 62, adp: 29, description: 'Never misses. Except when he does.' },
  { id: 'P030', name: 'Tailgate Tom', team: 'LA', projectedPoints: 61, adp: 30, description: 'Arrives early. Leaves late.' },
  { id: 'P031', name: 'Happy Hour Hannah', team: 'WA', projectedPoints: 60, adp: 31, description: 'Knows all the deals. Strategic drinker.' },
  { id: 'P032', name: 'Wine Night Wendy', team: 'NY', projectedPoints: 59, adp: 32, description: 'Box wine enthusiast. Talks too much.' },
  { id: 'P033', name: 'Shot Ski', team: 'CO', projectedPoints: 58, adp: 33, description: 'Drinks on the slopes. Dangerous.' },
  { id: 'P034', name: 'Seltzer Sam', team: 'FL', projectedPoints: 57, adp: 34, description: 'Low cal life. Fizz master.' },
  { id: 'P035', name: 'Nonalcoholic Ned', team: 'UT', projectedPoints: 56, adp: 35, description: 'DD for life. Still knows how to party.' },
  { id: 'P036', name: 'Pint Size Pete', team: 'IR', projectedPoints: 55, adp: 36, description: 'Little but fierce. Guinness regular.' },
  { id: 'P037', name: 'Cork Dork Cathy', team: 'CA', projectedPoints: 54, adp: 37, description: 'Can tell you anything about wine. Annoyingly knowledgeable.' },
  { id: 'P038', name: 'Brewery Brian', team: 'CO', projectedPoints: 53, adp: 38, description: 'Makes his own. Home brewer.' },
  { id: 'P039', name: 'Distillery Danny', team: 'TX', projectedPoints: 52, adp: 39, description: 'Knows a guy who knows a guy.' },
  { id: 'P040', name: 'Mixologist Max', team: 'NV', projectedPoints: 51, adp: 40, description: 'Fancy drinks. Expensive taste.' },
  { id: 'P041', name: 'Cheers Chip', team: 'MA', projectedPoints: 50, adp: 41, description: 'To good health! Everyone.' },
  { id: 'P042', name: 'Drunky Dan', team: 'OH', projectedPoints: 49, adp: 42, description: 'Neverchanges. Consistently confused.' },
  { id: 'P043', name: 'Sloshed Stacy', team: 'TX', projectedPoints: 48, adp: 43, description: 'The life of every party. Literally.' },
  { id: 'P044', name: 'Tipsy Tina', team: 'FL', projectedPoints: 47, adp: 44, description: 'Wobbles but never falls.' },
  { id: 'P045', name: 'Wasted Wayne', team: 'NV', projectedPoints: 46, adp: 45, description: 'Where did his keys even go?' },
  { id: 'P046', name: 'Fuzzy Frank', team: 'WA', projectedPoints: 45, adp: 46, description: 'Can\'t feel his face. Normal.' },
  { id: 'P047', name: 'Hangry Hank', team: 'TX', projectedPoints: 44, adp: 47, description: 'Morning after hero. Order of the greasy spoon.' },
  { id: 'P048', name: 'Dry Jan', team: 'CA', projectedPoints: 43, adp: 48, description: 'Starts in January. Ends... next January.' },
  { id: 'P049', name: 'Buzzed Brenda', team: 'OR', projectedPoints: 42, adp: 49, description: 'Exactly three drinks. Every time.' },
  { id: 'P050', name: 'Tipsy Tom', team: 'NY', projectedPoints: 41, adp: 50, description: 'Uber home. Smart cookie.' },
];

export async function seed() {
  console.log('Seeding drinkers...');
  
  const existing = await query('SELECT COUNT(*) as count FROM players');
  if (parseInt(existing.rows[0].count) > 0) {
    console.log(`Players table already has ${existing.rows[0].count} players. Skipping seed.`);
    return;
  }
  
  for (const player of players) {
    await query(
      `INSERT INTO players (id, name, position, team, projected_points, adp, status, description)
       VALUES ($1, $2, 'drinker', $3, $4, $5, 'active', $6)`,
      [player.id, player.name, player.team, player.projectedPoints, player.adp, player.description]
    );
  }
  
  console.log(`✅ Seeded ${players.length} drinkers`);
}

seed().catch(console.error);