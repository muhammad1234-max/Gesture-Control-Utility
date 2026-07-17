import React, { useState } from 'react';

const MOCK_SKILLS = [
  { id: 'skill.browser.tabs', name: 'Browser Tabs Manager', version: '1.2.0', status: 'installed', author: 'System' },
  { id: 'skill.windows.snap', name: 'Window Snap Organizer', version: '2.0.1', status: 'installed', author: 'System' },
  { id: 'skill.github.review', name: 'GitHub Review Assistant', version: '1.0.0', status: 'available', author: 'Community' },
];

export const SkillManagerView: React.FC = () => {
  const [skills, setSkills] = useState(MOCK_SKILLS);

  return (
    <div className="p-6 text-white bg-slate-900 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Skill Marketplace</h1>
        <p className="text-slate-400">Discover and manage specialized skills for your AI Copilot.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {skills.map(skill => (
          <div key={skill.id} className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-blue-400">{skill.name}</h2>
              <span className="bg-slate-700 px-2 py-1 rounded text-xs font-mono">{skill.version}</span>
            </div>
            
            <p className="text-sm text-slate-400 mb-6 flex-grow">
              Author: {skill.author} <br/>
              ID: {skill.id}
            </p>
            
            <div className="mt-auto pt-4 border-t border-slate-700/50">
              {skill.status === 'installed' ? (
                <button className="w-full py-2 bg-slate-700 text-slate-300 rounded font-medium cursor-not-allowed">
                  Installed
                </button>
              ) : (
                <button className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded font-medium transition-colors shadow-lg shadow-blue-900/20">
                  Install Skill
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
