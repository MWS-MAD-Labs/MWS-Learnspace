import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { storageService } from '../../services/storageService';
import { SFAObservationRecord } from '../../types';
import { Save, CheckCircle2, ArrowRight } from 'lucide-react';

const SFA_TABS = [
  'Student Info',
  'Part 1: Participation',
  'Part 2: Task Supports',
  'Part 3: Activity Performance',
  'Adaptations Checklist',
  'Score Summary',
] as const;

export const SFAObservationView: React.FC = () => {
  const {
    selectedStudentId,
    setSelectedStudentId,
    students,
    currentUser,
    showToast,
    refreshData,
    navigateToIEP,
  } = useApp();

  const specialStudents = students.filter((s) => s.specialNeedsFlag);
  const currentStudent =
    students.find((s) => s.id === selectedStudentId) ||
    specialStudents[0] ||
    students[0];

  const [activeTab, setActiveTab] = useState<(typeof SFA_TABS)[number]>(
    'Part 1: Participation',
  );

  const [record, setRecord] = useState<SFAObservationRecord>(() => {
    const existing = storageService.getSFAObservations(currentStudent.id);
    if (existing.length > 0) return existing[0];

    return {
      id: `sfa-${Date.now()}`,
      studentId: currentStudent.id,
      observationType: 'SFA',
      recordYear: '2026',
      assessmentDate: '2026-10-18',
      observerId: currentUser.id,
      observerName: currentUser.name,
      coordinatorName: `${currentUser.name} & Dr. Sarah Jenkins`,
      status: 'Draft',
      programRecommendation: 'Regular',
      respondents: [
        {
          id: 'r1',
          name: currentUser.name,
          role: currentUser.roleTitle,
          initials: 'SW',
        },
      ],
      primaryLanguage: 'English & Japanese',
      writingMethod: 'Slant board & adaptive grip',
      mobilityMethod: 'Independent ambulation',
      conditionsAffectingPerformance: 'Sensory overload during transitions',
      participationScores: {
        regularClassroom: 4,
        specialEdClassroom: 6,
        playgroundRecess: 4,
        transportation: 5,
        bathroomToilet: 5,
        transitions: 4,
        mealSnackTime: 4,
      },
      participationAverage: 4.57,
      taskSupports: {
        physicalAssistance: 3,
        physicalAdaptation: 4,
        cognitiveAssistance: 3,
        cognitiveAdaptation: 3,
      },
      activityPerformance: {
        travel: 3,
        maintaining_posture: 3,
        manipulation: 3,
        eating_drinking: 4,
        hygiene: 4,
        clothing_management: 3,
        functional_communication: 3,
        memory_understanding: 3,
        following_social_conventions: 3,
        task_behavior_completion: 3,
      },
      adaptations: [
        'Slant board for paper positioning',
        'Visual daily schedule strip at desk',
        'Noise-reduction headphones for fire drills',
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  const handleParticipationScoreChange = (
    key: keyof SFAObservationRecord['participationScores'],
    score: number,
  ) => {
    const updated = {
      ...record.participationScores,
      [key]: score,
    };
    const scores = Object.values(updated).filter(
      (v): v is number => typeof v === 'number',
    );
    const avg = scores.length
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    setRecord((prev) => ({
      ...prev,
      participationScores: updated,
      participationAverage: parseFloat(avg.toFixed(2)),
    }));
  };

  const handleTaskSupportChange = (
    key: keyof SFAObservationRecord['taskSupports'],
    score: number,
  ) => {
    setRecord((prev) => ({
      ...prev,
      taskSupports: {
        ...prev.taskSupports,
        [key]: score,
      },
    }));
  };

  const handleToggleAdaptation = (adaptation: string) => {
    setRecord((prev) => {
      const exists = prev.adaptations.includes(adaptation);
      return {
        ...prev,
        adaptations: exists
          ? prev.adaptations.filter((a) => a !== adaptation)
          : [...prev.adaptations, adaptation],
      };
    });
  };

  const handleSave = (isCompleted = false) => {
    const updated: SFAObservationRecord = {
      ...record,
      studentId: currentStudent.id,
      status: isCompleted ? 'Completed' : 'Draft',
      updatedAt: new Date().toISOString(),
    };
    storageService.saveSFAObservation(updated);
    setRecord(updated);
    showToast(
      'success',
      isCompleted ? 'SFA Assessment Completed' : 'SFA Draft Saved',
      `Saved School Function Assessment for ${currentStudent.fullName}.`,
    );
    refreshData();
  };

  return (
    <div
      id="sfa-observation-view"
      className="space-y-6 max-w-6xl mx-auto pb-24"
    >
      {/* Student & Observer Header */}
      <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={
              currentStudent.avatarUrl ||
              'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=120'
            }
            alt={currentStudent.fullName}
            className="w-14 h-14 rounded-2xl object-cover border-2 border-[#EFE7DC] shadow-xs"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6E161E] bg-[#6E161E]/10 px-2.5 py-0.5 rounded-full">
                SFA Instrument
              </span>
              <span className="text-xs font-semibold text-stone-500">
                School Function Assessment (SFA)
              </span>
            </div>
            <h1 className="text-2xl font-black font-heading text-stone-900 mt-1">
              {currentStudent.fullName}
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Grade: {currentStudent.grade} · Coordinator:{' '}
              {record.coordinatorName} · Avg Participation:{' '}
              <strong className="text-stone-900">
                {record.participationAverage.toFixed(1)}/6.0
              </strong>
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
              id="sfa-student-select"
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                const ex = storageService.getSFAObservations(e.target.value);
                if (ex.length > 0) setRecord(ex[0]);
              }}
              className="px-3.5 py-2 text-xs font-bold bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl text-stone-900 focus:outline-hidden"
            >
              {specialStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.grade})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Internal Navigation Tabs */}
      <div className="flex border-b border-stone-200 bg-white rounded-2xl p-1 shadow-xs gap-1 overflow-x-auto">
        {SFA_TABS.map((tab) => (
          <button
            key={tab}
            id={`sfa-tab-${tab.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab
                ? 'bg-[#6E161E] text-white shadow-xs'
                : 'text-stone-600 hover:bg-[#FAF5EF]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'Part 1: Participation' && (
        <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs space-y-6">
          <div>
            <span className="text-xs font-bold text-[#6E161E] uppercase tracking-wider">
              Part 1: Participation Scale (1–6)
            </span>
            <h2 className="text-lg font-bold text-stone-900 mt-0.5">
              Classroom & School Environment Participation Ratings
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              1 = Participation extremely limited · 4 = Moderate participation
              with cues · 6 = Full independent participation
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                key: 'regularClassroom',
                label:
                  '1. Regular Classroom Setting (Math, Language Arts, Group Discussions)',
              },
              {
                key: 'specialEdClassroom',
                label:
                  '2. Special Education Resource Room / Co-Teaching Stations',
              },
              {
                key: 'playgroundRecess',
                label: '3. Playground / Recess & Outdoor Play',
              },
              {
                key: 'transportation',
                label:
                  '4. Transportation (Arrival, Departure, Hallway Transits)',
              },
              {
                key: 'bathroomToilet',
                label: '5. Bathroom & Personal Hygiene Routines',
              },
              {
                key: 'transitions',
                label: '6. Classroom Stations & Activity Transitions',
              },
              {
                key: 'mealSnackTime',
                label: '7. Mealtime / Cafeteria & Snack Routines',
              },
            ].map((setting) => {
              const currentScore =
                (record.participationScores as any)[setting.key] || 1;

              return (
                <div
                  key={setting.key}
                  className="p-4 bg-[#FAF5EF] border border-[#E8DFC8] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <span className="text-xs font-semibold text-stone-900">
                    {setting.label}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {[1, 2, 3, 4, 5, 6].map((score) => (
                      <button
                        key={score}
                        type="button"
                        onClick={() =>
                          handleParticipationScoreChange(
                            setting.key as any,
                            score,
                          )
                        }
                        className={`w-9 h-8 rounded-lg text-xs font-bold border transition-all ${
                          currentScore === score
                            ? 'bg-[#6E161E] text-white border-[#6E161E] shadow-xs'
                            : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'Part 2: Task Supports' && (
        <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs space-y-6">
          <div>
            <span className="text-xs font-bold text-[#6E161E] uppercase tracking-wider">
              Part 2: Task Supports
            </span>
            <h2 className="text-lg font-bold text-stone-900 mt-0.5">
              Assistance & Adaptations Levels (1–4 Scale)
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              1 = Extensive support · 2 = Moderate support · 3 = Minimal support
              · 4 = No support needed
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-[#FAF5EF] border border-[#E8DFC8] rounded-2xl space-y-3">
              <span className="text-xs font-bold text-stone-900">
                Physical Tasks - Assistance Level
              </span>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() =>
                      handleTaskSupportChange('physicalAssistance', v)
                    }
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                      record.taskSupports.physicalAssistance === v
                        ? 'bg-[#6E161E] text-white border-[#6E161E]'
                        : 'bg-white text-stone-700 border-stone-300'
                    }`}
                  >
                    Level {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 bg-[#FAF5EF] border border-[#E8DFC8] rounded-2xl space-y-3">
              <span className="text-xs font-bold text-stone-900">
                Physical Tasks - Adaptations Level
              </span>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() =>
                      handleTaskSupportChange('physicalAdaptation', v)
                    }
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                      record.taskSupports.physicalAdaptation === v
                        ? 'bg-[#6E161E] text-white border-[#6E161E]'
                        : 'bg-white text-stone-700 border-stone-300'
                    }`}
                  >
                    Level {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 bg-[#FAF5EF] border border-[#E8DFC8] rounded-2xl space-y-3">
              <span className="text-xs font-bold text-stone-900">
                Cognitive Tasks - Assistance Level
              </span>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() =>
                      handleTaskSupportChange('cognitiveAssistance', v)
                    }
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                      record.taskSupports.cognitiveAssistance === v
                        ? 'bg-[#6E161E] text-white border-[#6E161E]'
                        : 'bg-white text-stone-700 border-stone-300'
                    }`}
                  >
                    Level {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 bg-[#FAF5EF] border border-[#E8DFC8] rounded-2xl space-y-3">
              <span className="text-xs font-bold text-stone-900">
                Cognitive Tasks - Adaptations Level
              </span>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() =>
                      handleTaskSupportChange('cognitiveAdaptation', v)
                    }
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                      record.taskSupports.cognitiveAdaptation === v
                        ? 'bg-[#6E161E] text-white border-[#6E161E]'
                        : 'bg-white text-stone-700 border-stone-300'
                    }`}
                  >
                    Level {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Adaptations Checklist' && (
        <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs space-y-4">
          <div>
            <span className="text-xs font-bold text-[#6E161E] uppercase tracking-wider">
              Classroom & Environmental Accommodations
            </span>
            <h2 className="text-lg font-bold text-stone-900 mt-0.5">
              Active Adaptations Checklist
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              'Slant board for paper positioning',
              'Chunky ergonomic pencil grips',
              'Visual daily schedule strip at desk',
              'Quiet sensory corner retreat access',
              'Noise-reduction headphones for fire drills and loud assemblies',
              'Weighted sensory vest during floor circle time (15 min intervals)',
              'Individual visual first-then transition card',
              'Raised-line handwriting worksheets',
            ].map((adapt) => {
              const isChecked = record.adaptations.includes(adapt);

              return (
                <div
                  key={adapt}
                  onClick={() => handleToggleAdaptation(adapt)}
                  className={`p-3.5 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-semibold shadow-2xs'
                      : 'bg-[#FAF5EF] border-[#E8DFC8] text-stone-700 hover:bg-[#F2EAE0]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="w-4 h-4 text-[#6E161E] rounded accent-[#6E161E]"
                  />
                  <span className="text-xs">{adapt}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(activeTab === 'Student Info' ||
        activeTab === 'Part 3: Activity Performance' ||
        activeTab === 'Score Summary') && (
        <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-stone-900">
            {activeTab} Summary
          </h2>
          <div className="p-4 bg-[#FAF5EF] rounded-2xl border border-[#E8DFC8] space-y-2 text-xs text-stone-700">
            <p>
              <strong>Primary Language:</strong> {record.primaryLanguage}
            </p>
            <p>
              <strong>Writing Method:</strong> {record.writingMethod}
            </p>
            <p>
              <strong>Conditions Affecting Performance:</strong>{' '}
              {record.conditionsAffectingPerformance}
            </p>
            <p>
              <strong>Participation Score Average:</strong>{' '}
              {record.participationAverage.toFixed(2)} / 6.0
            </p>
          </div>
        </div>
      )}

      {/* Sticky Bottom Actions */}
      <div
        id="sfa-sticky-bar"
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
            id="sfa-save-draft-btn"
            onClick={() => handleSave(false)}
            className="px-5 py-2.5 bg-[#FAF5EF] hover:bg-[#F2EAE0] text-stone-800 text-xs font-bold rounded-xl border border-[#E8DFC8] shadow-2xs transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Draft
          </button>

          <button
            type="button"
            id="sfa-complete-btn"
            onClick={() => handleSave(true)}
            className="px-6 py-2.5 bg-[#6E161E] hover:bg-[#581117] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Complete SFA Assessment
          </button>
        </div>
      </div>
    </div>
  );
};
