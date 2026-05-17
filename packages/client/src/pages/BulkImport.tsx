import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { usePermissions } from '../hooks/usePermissions';

interface ParsedPlayer {
  name: string;
  description?: string;
  team?: string;
  profileImage?: string;
  projectedPoints?: number;
  adp?: number;
  valid: boolean;
  error?: string;
}

export default function BulkImport() {
  const navigate = useNavigate();
  const perms = usePermissions();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [csvData, setCsvData] = useState<ParsedPlayer[]>([]);
  const [rawCsv, setRawCsv] = useState('');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; failed: number; errors: string[] } | null>(null);

  const parseCSV = (text: string) => {
    setParsing(true);
    const lines = text.trim().split('\n');
    const players: ParsedPlayer[] = [];
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV respecting quoted fields
      const values = parseCSVLine(line);
      
      const name = values[0]?.trim();
      const description = values[1]?.trim() || undefined;
      const team = values[2]?.trim() || undefined;
      const profileImage = values[3]?.trim() || undefined;
      const projectedPoints = values[4] ? parseInt(values[4]) : undefined;
      const adp = values[5] ? parseInt(values[5]) : undefined;
      
      const player: ParsedPlayer = {
        name,
        description,
        team,
        profileImage,
        projectedPoints,
        adp,
        valid: !!name,
      };
      
      if (!name) {
        player.error = 'Name is required';
        player.valid = false;
      }
      
      players.push(player);
    }
    
    setCsvData(players);
    setParsing(false);
  };

  // Simple CSV parser that handles quoted fields
  const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    
    return values;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawCsv(text);
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const validPlayers = csvData.filter(p => p.valid);
    if (validPlayers.length === 0) return;
    
    setImporting(true);
    try {
      const importResult = await api.bulkImportPlayers(validPlayers.map(p => ({
        name: p.name,
        description: p.description,
        team: p.team,
        profileImage: p.profileImage,
        projectedPoints: p.projectedPoints,
        adp: p.adp,
      })));
      setResult(importResult);
    } catch (err) {
      console.error('Import failed:', err);
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setCsvData([]);
    setRawCsv('');
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!perms.canCreatePlayer) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#023E8A' }}>
        <div className="text-center">
          <p className="text-red-400 mb-4">Admin access required</p>
          <Link to="/leagues" className="btn-primary">
            Back to Leagues
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#023E8A' }}>
      <header className="border-b" style={{ backgroundColor: '#0077B6', borderColor: '#D4A574' }}>
        <div className="max-w-6xl mx-auto px-3 md:px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 md:p-4">
            <button onClick={() => navigate('/leagues')} className="text-sand-500 hover:text-white">
              ← Back
            </button>
            <h1 className="text-lg md:text-xl font-bold" style={{ color: '#D4A574' }}>
              📥 Bulk Import Players
            </h1>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('wizardstaff_role');
              localStorage.removeItem('wizardstaff_auth');
              localStorage.removeItem('wizardstaff_token');
              navigate('/login');
            }}
            className="btn-secondary text-sm"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 md:px-4 py-4 md:py-8">
        {/* Instructions */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">📋 CSV Format Instructions</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Required Columns (in order):</h3>
              <div className="bg-ocean-800 p-3 rounded text-sm font-mono overflow-x-auto">
                name,description,team,profile_image,projected_points,adp
              </div>
              <p className="text-xs text-sand-500 mt-1">
                Column order matters! Use exactly this header row.
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-2">Column Descriptions:</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-sand-500">
                    <th className="pb-2">Column</th>
                    <th className="pb-2">Required</th>
                    <th className="pb-2">Description</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <tr>
                    <td className="py-1 text-emerald-400">name</td>
                    <td className="py-1">✅ Yes</td>
                    <td className="py-1">Player's name (required)</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-emerald-400">description</td>
                    <td className="py-1">❌ No</td>
                    <td className="py-1">Short bio or tagline</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-emerald-400">team</td>
                    <td className="py-1">❌ No</td>
                    <td className="py-1">Bar or group affiliation</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-emerald-400">profile_image</td>
                    <td className="py-1">❌ No</td>
                    <td className="py-1">URL to photo</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-emerald-400">projected_points</td>
                    <td className="py-1">❌ No</td>
                    <td className="py-1">Draft ranking (1-100)</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-emerald-400">adp</td>
                    <td className="py-1">❌ No</td>
                    <td className="py-1">Average draft position</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="font-medium mb-2">Example CSV:</h3>
              <pre className="bg-ocean-800 p-3 rounded text-xs font-mono overflow-x-auto">
name,description,team,profile_image,projected_points,adp
"Beer Guy","Always brings the good stuff","Joe's Bar",https://example.com/beer.jpg,95,1
"Wine Wizard","Sommelier skills","Wine Cellar",,92,2
"Whiskey Wolf","Premium bourbon collector","Kentucky Bourbon Trail",https://example.com/whiskey.jpg,90,3
"Shot Master","Never misses a shot","Shot Bar",,88,4
"Beer Pong Champ","Legendary skills","Party League",,85,5
              </pre>
            </div>
          </div>
        </div>

        {/* Import Form */}
        {result ? (
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">📊 Import Results</h2>
            
            <div className="flex gap-3 md:p-4 mb-4">
              <div className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-emerald-400">{result.created}</p>
                <p className="text-sm text-sand-500">Created</p>
              </div>
              <div className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-red-400">{result.failed}</p>
                <p className="text-sm text-sand-500">Failed</p>
              </div>
            </div>
            
            {result.errors.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium mb-2 text-red-400">Errors:</h3>
                <ul className="text-sm text-sand-500 space-y-1">
                  {result.errors.slice(0, 10).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {result.errors.length > 10 && (
                    <li>...and {result.errors.length - 10} more</li>
                  )}
                </ul>
              </div>
            )}
            
            <button onClick={handleReset} className="btn-primary mt-4">
              Import More
            </button>
          </div>
        ) : (
          <>
            <div className="card mb-6">
              <h2 className="text-lg font-semibold mb-4">📁 Upload CSV File</h2>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-sand-500
                  file:mr-4 file:py-2 file:px-3 md:px-4
                  file:rounded file:border-0
                  file:text-sm file:font-semibold
                  file:bg-sand-600 file:text-ocean-900
                  hover:file:bg-sand-500"
              />
              
              <p className="text-xs text-sand-500 mt-2">
                Or paste CSV data below:
              </p>
              <textarea
                value={rawCsv}
                onChange={(e) => {
                  setRawCsv(e.target.value);
                  if (e.target.value) parseCSV(e.target.value);
                }}
                placeholder="name,description,team,profile_image,projected_points,adp"
                className="w-full h-32 mt-2 font-mono text-sm"
              />
            </div>

            {/* Preview */}
            {csvData.length > 0 && (
              <div className="card mb-6">
                <h2 className="text-lg font-semibold mb-4">
                  👀 Preview ({csvData.filter(p => p.valid).length} valid, {csvData.filter(p => !p.valid).length} invalid)
                </h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-sand-500 border-b border-ocean-700">
                        <th className="pb-2">Name</th>
                        <th className="pb-2">Description</th>
                        <th className="pb-2">Team</th>
                        <th className="pb-2">Points</th>
                        <th className="pb-2">ADP</th>
                        <th className="pb-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.slice(0, 20).map((player, i) => (
                        <tr key={i} className={`border-b border-ocean-700 ${player.valid ? '' : 'text-red-400'}`}>
                          <td className="py-2">{player.name}</td>
                          <td className="py-2 text-sand-500">{player.description || '-'}</td>
                          <td className="py-2 text-sand-500">{player.team || '-'}</td>
                          <td className="py-2 text-sand-500">{player.projectedPoints || '-'}</td>
                          <td className="py-2 text-sand-500">{player.adp || '-'}</td>
                          <td className="py-2">
                            {player.valid ? (
                              <span className="text-emerald-400">✓</span>
                            ) : (
                              <span className="text-red-400" title={player.error}>✗ {player.error}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {csvData.length > 20 && (
                  <p className="text-sm text-sand-500 mt-2">
                    ...and {csvData.length - 20} more rows
                  </p>
                )}
              </div>
            )}

            {/* Import Button */}
            {csvData.length > 0 && csvData.some(p => p.valid) && (
              <div className="flex gap-3 md:p-4">
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="btn-primary"
                >
                  {importing ? 'Importing...' : `Import ${csvData.filter(p => p.valid).length} Players`}
                </button>
                <button onClick={handleReset} className="btn-secondary">
                  Reset
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}