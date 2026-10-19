import React from 'react';
import { UserPersona } from '../types/workbench';
import { PRESET_PERSONAS } from '../services/abacEnforcer';
import { ShieldCheck, UserCheck } from 'lucide-react';

interface PersonaBarProps {
  activePersona: UserPersona;
  onSelectPersona: (persona: UserPersona) => void;
}

export const PersonaBar: React.FC<PersonaBarProps> = ({ activePersona, onSelectPersona }) => {
  return (
    <div className="bg-white border-b border-slate-200 px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        {/* Active persona descriptor */}
        <div className="flex items-center gap-2.5 text-slate-700">
          <div className="flex items-center gap-1.5 font-medium text-slate-900">
            <UserCheck className="w-4 h-4 text-slate-700" />
            <span>Active Identity:</span>
            <span className="font-semibold text-slate-900">{activePersona.name}</span>
          </div>
          <span className="text-slate-300" aria-hidden="true">|</span>
          <div className="flex items-center gap-2 text-slate-600">
            <span>Role: <strong className="text-slate-800">{activePersona.role}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Desk: <strong className="text-slate-800 font-mono">{activePersona.desk}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Region: <strong className="text-slate-800">{activePersona.region}</strong></span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-500 hidden lg:inline">{activePersona.department}</span>
          </div>
        </div>

        {/* Quick persona switcher buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-500 mr-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            Simulate Persona:
          </span>
          {PRESET_PERSONAS.map((persona) => {
            const isSelected = persona.id === activePersona.id;
            return (
              <button
                key={persona.id}
                onClick={() => onSelectPersona(persona)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                }`}
                title={`Switch to ${persona.name} (${persona.role} - ${persona.desk})`}
              >
                {persona.name.split(' ')[0]} ({persona.role.substring(0, 3)})
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
