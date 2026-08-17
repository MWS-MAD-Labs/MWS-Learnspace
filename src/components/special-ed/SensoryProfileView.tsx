import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { storageService } from '../../services/storageService';
import { SENSORY_PROFILE_ITEMS } from '../../data/seedData';
import { SensoryProfileRecord, SensoryRating } from '../../types';
import { 
  Activity, 
  Save, 
  CheckCircle2, 
  Info, 
  ChevronRight, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

const SECTIONS = ['Auditory', 'Visual', 'Touch', 'Movement', 'Behavioral'] as const;

export const SensoryProfileView: React.FC = () => {
  const { 
    selectedStudentId, 
    setSelectedStudentId, 
    students, 
    currentUser, 
    showToast,
    refreshData,
    navigateToIEP 
  } = useApp();

  const specialStudents = students.filter(s => s.specialNeedsFlag);
  const currentStudent = students.find(s => s.id === selectedStudentId) || specialStudents[0] || students[0];

  const [activeSection, setActiveSection] = useState<typeof SECTIONS[number]>('Auditory');

  const [record, setRecord] = useState<SensoryProfileRecord>(() => {
    const existing = storageService.getSensoryProfiles(currentStudent.id);
    if (existing.length > 0) return existing[0];

    return {
      id: `sp-${Date.now()}`,
      studentId: currentStudent.id,
      observationType: 'SENSORY_PROFILE',
      recordYear: '2026',
      observationDate: '2026-10-16',
      observerId: currentUser.id,
      observerName: currentUser.name,
      teacherContactFrequency: 'Daily (5 days/week)',
      teacherContactLength: 'Full School Year',
      status: 'Draft',
      responses: {},
      sectionScores: {
        auditory: { raw: 0, max: 40 },
        visual: { raw: 0, max: 40 },
        touch: { raw: 0, max: 40 },
        movement: { raw: 0, max: 40 },
        behavioral: { raw: 0, max: 60 }
      },
      totalRawScore: 0,
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  const handleRating = (itemId: string, rating: SensoryRating) => {
    const updatedResponses: Record<string, SensoryRating> = {
      ...record.responses,
      [itemId]: rating
    };

    // Calculate section scores
    let aud = 0, vis = 0, tch = 0, mov = 0, beh = 0;
    SENSORY_PROFILE_ITEMS.forEach(it => {
      const val = updatedResponses[it.id] || 0;
      if (it.section === 'Auditory') aud += val;
      else if (it.section === 'Visual') vis += val;
      else if (it.section === 'Touch') tch += val;
      else if (it.section === 'Movement') mov += val;
      else if (it.section === 'Behavioral') beh += val;
    });

    const total = aud + vis + tch + mov + beh;

    setRecord(prev => ({
      ...prev,
      responses: updatedResponses,
      sectionScores: {
        auditory: { raw: aud, max: 40 },
        visual: { raw: vis, max: 40 },
        touch: { raw: tch, max: 40 },
        movement: { raw: mov, max: 40 },
        behavioral: { raw: beh, max: 60 }
      },
      totalRawScore: total
    }));
  };

  const handleSave = (isCompleted = false) => {
    const updated: SensoryProfileRecord = {
      ...record,
      studentId: currentStudent.id,
      status: isCompleted ? 'Completed' : 'Draft',
      updatedAt: new Date().toISOString()
    };
    storageService.saveSensoryProfile(updated);
    setRecord(updated);
    showToast(
      'success', 
      isCompleted ? 'Sensory Profile Completed' : 'Sensory Profile Draft Saved', 
      `Saved sensory processing profile for ${currentStudent.fullName}.`
    );
    refreshData();
  };

  const currentItems = SENSORY_PROFILE_ITEMS.filter(i => i.section === activeSection);

  return (
    <div id="sensory-profile-view" className="space-y-6 max-w-6xl mx-auto pb-24">
      {/* Student & Observer Header */}
      <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={currentStudent.avatarUrl || 'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=120'}
            alt={currentStudent.fullName}
            className="w-14 h-14 rounded-2xl object-cover border-2 border-[#EFE7DC] shadow-xs"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6E161E] bg-[#6E161E]/10 px-2.5 py-0.5 rounded-full">
                Sensory Profile 2
              </span>
              <span className="text-xs font-semibold text-stone-500">
                School Companion Questionnaire (Ages 3–14)
              </span>
            </div>
            <h1 className="text-2xl font-black font-heading text-stone-900 mt-1">
              {currentStudent.fullName}
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Grade: {currentStudent.grade} · Observer: {record.observerName} · Total Score: <strong className="text-stone-900">{record.totalRawScore} pts</strong>
            </p>
          </div>
        </div>

        {/* Student Selector */}
        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
              Target Student
            </span>
            <select
              id="sensory-student-select"
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                const ex = storageService.getSensoryProfiles(e.target.value);
                if (ex.length > 0) setRecord(ex[0]);
              }}
              className="px-3.5 py-2 text-xs font-bold bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl text-stone-900 focus:outline-hidden"
            >
              {specialStudents.map(s => (
                <option key={s.id} value={s.id}>{s.fullName} ({s.grade})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Scale Guide & Teacher Contact Details */}
      <div className="bg-[#FFFDF9] border border-[#EFE7DC] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200/80 pb-3">
          <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
            Teacher Observation Context & Rating Scale
          </span>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-stone-500">Contact Frequency:</span>
            <input
              type="text"
              value={record.teacherContactFrequency}
              onChange={(e) => setRecord({ ...record, teacherContactFrequency: e.target.value })}
              className="px-2.5 py-1 bg-white border border-[#E8DFC8] rounded-lg font-semibold text-stone-900 text-xs"
            />
          </div>
        </div>

        {/* 5-Point Rating Rubric */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
          <div className="p-2 rounded-xl bg-purple-50 border border-purple-200">
            <span className="font-black text-sm text-purple-900 block">5</span>
            <span className="text-[11px] text-purple-800">Almost Always</span>
          </div>
          <div className="p-2 rounded-xl bg-blue-50 border border-blue-200">
            <span className="font-black text-sm text-blue-900 block">4</span>
            <span className="text-[11px] text-blue-800">Frequently</span>
          </div>
          <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
            <span className="font-black text-sm text-amber-900 block">3</span>
            <span className="text-[11px] text-amber-800">Half The Time</span>
          </div>
          <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
            <span className="font-black text-sm text-emerald-900 block">2</span>
            <span className="text-[11px] text-emerald-800">Occasionally</span>
          </div>
          <div className="p-2 rounded-xl bg-stone-100 border border-stone-200">
            <span className="font-black text-sm text-stone-800 block">1</span>
            <span className="text-[11px] text-stone-600">Almost Never</span>
          </div>
          <div className="p-2 rounded-xl bg-stone-50 border border-stone-200">
            <span className="font-black text-sm text-stone-600 block">0</span>
            <span className="text-[11px] text-stone-500">Does Not Apply</span>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex border-b border-stone-200 bg-white rounded-2xl p-1 shadow-xs gap-1 overflow-x-auto">
        {SECTIONS.map((sec) => {
          const isSelected = activeSection === sec;
          const secKey = sec.toLowerCase() as keyof typeof record.sectionScores;
          const score = record.sectionScores[secKey]?.raw || 0;
          const max = record.sectionScores[secKey]?.max || 40;

          return (
            <button
              key={sec}
              id={`sensory-tab-${sec.toLowerCase()}`}
              onClick={() => setActiveSection(sec)}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                isSelected
                  ? 'bg-[#6E161E] text-white shadow-xs'
                  : 'text-stone-600 hover:bg-[#FAF5EF]'
              }`}
            >
              <span>{sec} Processing</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                isSelected ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-700'
              }`}>
                {score}/{max}
              </span>
            </button>
          );
        })}
      </div>

      {/* Question Items List */}
      <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <h2 className="text-base font-bold text-stone-900">
            {activeSection} Processing Items ({currentItems.length} Observations)
          </h2>
          <span className="text-xs font-semibold text-stone-500">
            Select 0 to 5 for each observed classroom behavior
          </span>
        </div>

        <div className="space-y-3">
          {currentItems.map((item) => {
            const currentVal = record.responses[item.id];

            return (
              <div
                key={item.id}
                id={`sensory-item-${item.id}`}
                className="p-4 bg-[#FAF5EF] border border-[#E8DFC8] rounded-2xl space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-[#6E161E]/10 text-[#6E161E] font-bold text-xs flex items-center justify-center shrink-0">
                      {item.number}
                    </span>
                    <p className="text-xs font-semibold text-stone-900 leading-relaxed pt-0.5">
                      {item.text}
                    </p>
                  </div>

                  {item.factorLabel && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 shrink-0 self-start sm:self-auto">
                      {item.factorLabel}
                    </span>
                  )}
                </div>

                <div className="pt-2 border-t border-[#E8DFC8]/60 flex items-center justify-end gap-1.5">
                  {[5, 4, 3, 2, 1, 0].map((val) => {
                    const isSelected = currentVal === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        id={`btn-sensory-${item.id}-${val}`}
                        onClick={() => handleRating(item.id, val as SensoryRating)}
                        className={`w-9 h-8 text-xs font-bold rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-[#6E161E] text-white border-[#6E161E] shadow-xs'
                            : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                        }`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Notes */}
        <div className="pt-4 border-t border-stone-100 space-y-1.5">
          <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            Sensory Integration Notes & Environment Recommendations
          </label>
          <textarea
            rows={3}
            value={record.notes || ''}
            onChange={(e) => setRecord({ ...record, notes: e.target.value })}
            placeholder="Document sensory triggers, calming strategies, weighted blanket responses, noise dampening needs..."
            className="w-full p-3 text-xs bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl text-stone-900 leading-relaxed"
          />
        </div>
      </div>

      {/* Sticky Bottom Actions */}
      <div 
        id="sensory-sticky-bar"
        className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-md border-t border-[#EFE7DC] px-6 py-4 shadow-lg flex items-center justify-between"
      >
        <button
          type="button"
          onClick={() => navigateToIEP(currentStudent.id)}
          className="text-xs font-bold text-[#6E161E] hover:underline flex items-center gap-1.5"
        >
          View Annual IEP Plan <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            id="sensory-save-draft-btn"
            onClick={() => handleSave(false)}
            className="px-5 py-2.5 bg-[#FAF5EF] hover:bg-[#F2EAE0] text-stone-800 text-xs font-bold rounded-xl border border-[#E8DFC8] shadow-2xs transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Draft
          </button>

          <button
            type="button"
            id="sensory-complete-btn"
            onClick={() => handleSave(true)}
            className="px-6 py-2.5 bg-[#6E161E] hover:bg-[#581117] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Complete Sensory Profile
          </button>
        </div>
      </div>
    </div>
  );
};
