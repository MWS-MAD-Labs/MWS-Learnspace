import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { storageService } from '../../services/storageService';
import { FEDC_MILESTONES } from '../../data/seedData';
import { FEDCObservationRecord, FEDCRating, FEDCItemResponse } from '../../types';
import { 
  Brain, 
  Save, 
  CheckCircle2, 
  User, 
  Calendar, 
  Clock, 
  Info, 
  FileText,
  ChevronRight,
  Sparkles,
  ArrowRight
} from 'lucide-react';

const RATING_WEIGHTS: Record<FEDCRating, number> = {
  S: 3,
  K: 2,
  T: 1,
  H: 0
};

export const FEDCObservationView: React.FC = () => {
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

  const [activeMilestoneId, setActiveMilestoneId] = useState<number>(1);

  // Load existing observation or create new
  const [record, setRecord] = useState<FEDCObservationRecord>(() => {
    const existing = storageService.getFEDCObservations(currentStudent.id);
    if (existing.length > 0) {
      return existing[0];
    }
    return {
      id: `fedc-${Date.now()}`,
      studentId: currentStudent.id,
      observationType: 'FEDC',
      recordYear: '2026',
      observationDate: '2026-10-14',
      observerId: currentUser.id,
      observerName: currentUser.name,
      status: 'Draft',
      responses: {},
      milestoneScores: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
      totalScore: 0,
      maxPossibleScore: 72,
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  // Calculate scores on rating change
  const handleRatingChange = (itemId: string, milestoneId: number, rating: FEDCRating) => {
    const prevResp = record.responses[itemId] || { itemId };
    const score = RATING_WEIGHTS[rating];

    const updatedResponses: Record<string, FEDCItemResponse> = {
      ...record.responses,
      [itemId]: {
        ...prevResp,
        itemId,
        rating,
        score
      }
    };

    // Recalculate milestone scores
    const milestoneScores: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    let total = 0;

    FEDC_MILESTONES.forEach(m => {
      let mTotal = 0;
      m.items.forEach(it => {
        const itResp = updatedResponses[it.id];
        if (itResp?.score !== undefined) {
          mTotal += itResp.score;
        }
      });
      milestoneScores[m.id] = mTotal;
      total += mTotal;
    });

    setRecord(prev => ({
      ...prev,
      responses: updatedResponses,
      milestoneScores,
      totalScore: total
    }));
  };

  const handleAgeChange = (itemId: string, masteredAge: string) => {
    const prevResp = record.responses[itemId] || { itemId };
    setRecord(prev => ({
      ...prev,
      responses: {
        ...prev.responses,
        [itemId]: {
          ...prevResp,
          masteredAge
        }
      }
    }));
  };

  const handleSave = (isCompleted = false) => {
    const updated: FEDCObservationRecord = {
      ...record,
      studentId: currentStudent.id,
      status: isCompleted ? 'Completed' : 'Draft',
      updatedAt: new Date().toISOString()
    };
    storageService.saveFEDCObservation(updated);
    setRecord(updated);
    showToast(
      'success', 
      isCompleted ? 'FEDC Observation Completed' : 'FEDC Draft Saved', 
      `Successfully saved functional emotional developmental baseline for ${currentStudent.fullName}.`
    );
    refreshData();
  };

  const activeMilestone = FEDC_MILESTONES.find(m => m.id === activeMilestoneId) || FEDC_MILESTONES[0];

  return (
    <div id="fedc-observation-view" className="space-y-6 max-w-6xl mx-auto pb-24">
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
                FEDC Instrument
              </span>
              <span className="text-xs font-semibold text-stone-500">
                Functional Emotional Developmental Capacities
              </span>
            </div>
            <h1 className="text-2xl font-black font-heading text-stone-900 mt-1">
              {currentStudent.fullName}
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Grade: {currentStudent.grade} ({currentStudent.className}) · DOB: {currentStudent.dateOfBirth} · Age: {currentStudent.age} yrs
            </p>
          </div>
        </div>

        {/* Student Selector & Score Badge */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
              Target Student
            </span>
            <select
              id="fedc-student-select"
              value={selectedStudentId}
              onChange={(e) => {
                setSelectedStudentId(e.target.value);
                const ex = storageService.getFEDCObservations(e.target.value);
                if (ex.length > 0) setRecord(ex[0]);
              }}
              className="px-3.5 py-2 text-xs font-bold bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl text-stone-900 focus:outline-hidden"
            >
              {specialStudents.map(s => (
                <option key={s.id} value={s.id}>{s.fullName} ({s.grade})</option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl text-center min-w-[100px]">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
              Cumulative Score
            </span>
            <span className="text-xl font-black text-[#6E161E]">
              {record.totalScore} <span className="text-xs text-stone-400 font-normal">/ 72</span>
            </span>
          </div>
        </div>
      </div>

      {/* Observation Metadata & Scoring Scale Guide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Scale Guide */}
        <div className="md:col-span-2 bg-[#FFFDF9] border border-[#EFE7DC] rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-bold text-stone-800 uppercase tracking-wider block mb-2">
            Pedoman Skala Penilaian (Scoring Rubric)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
              <span className="font-black text-sm block">S (3 Poin)</span>
              <span className="text-[11px]">Sering / Selalu Muncul</span>
            </div>
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
              <span className="font-black text-sm block">K (2 Poin)</span>
              <span className="text-[11px]">Kadang-kadang Muncul</span>
            </div>
            <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
              <span className="font-black text-sm block">T (1 Poin)</span>
              <span className="text-[11px]">Tidak Pernah Muncul</span>
            </div>
            <div className="p-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-900">
              <span className="font-black text-sm block">H (0 Poin)</span>
              <span className="text-[11px]">Hanya dengan Bantuan</span>
            </div>
          </div>
        </div>

        {/* Observation Metadata */}
        <div className="bg-white border border-[#EFE7DC] rounded-2xl p-4 shadow-xs space-y-3">
          <div>
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">Observer</span>
            <p className="text-xs font-bold text-stone-900 mt-0.5">{record.observerName}</p>
          </div>
          <div>
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">Observation Date</span>
            <input
              type="date"
              value={record.observationDate}
              onChange={(e) => setRecord({ ...record, observationDate: e.target.value })}
              className="text-xs font-bold text-stone-800 bg-[#FAF5EF] border border-[#E8DFC8] rounded-lg px-2 py-1 mt-0.5 w-full"
            />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Milestone Tabs & Item Ratings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: 6 Milestones Selector */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider px-1">
            6 Tonggak Perkembangan Emosional Fungsional
          </span>

          {FEDC_MILESTONES.map((milestone) => {
            const mScore = record.milestoneScores[milestone.id] || 0;
            const isSelected = activeMilestoneId === milestone.id;

            return (
              <button
                key={milestone.id}
                id={`milestone-tab-${milestone.id}`}
                onClick={() => setActiveMilestoneId(milestone.id)}
                className={`w-full p-4 text-left rounded-2xl border transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-[#6E161E] text-white border-[#6E161E] shadow-sm'
                    : 'bg-white text-stone-700 border-[#EFE7DC] hover:bg-[#FAF5EF]'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                    isSelected ? 'text-[#F5B842]' : 'text-stone-400'
                  }`}>
                    Tonggak {milestone.id}
                  </span>
                  <h3 className={`text-xs font-bold leading-tight mt-0.5 line-clamp-1 ${
                    isSelected ? 'text-white' : 'text-stone-900'
                  }`}>
                    {milestone.title}
                  </h3>
                </div>

                <div className="text-right shrink-0">
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-700'
                  }`}>
                    {mScore} / {milestone.maxScore}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right 2 Cols: Active Milestone Items Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-[#EFE7DC] rounded-3xl p-6 shadow-xs space-y-6">
            <div className="border-b border-stone-100 pb-4">
              <span className="text-xs font-bold text-[#6E161E] uppercase tracking-wider">
                Tonggak {activeMilestone.id} Detail
              </span>
              <h2 className="text-lg font-black font-heading text-stone-900 mt-1">
                {activeMilestone.title}
              </h2>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                {activeMilestone.description}
              </p>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {activeMilestone.items.map((item) => {
                const resp = record.responses[item.id] || {};
                const currentRating = resp.rating;

                return (
                  <div
                    key={item.id}
                    id={`fedc-item-${item.id}`}
                    className="p-4 bg-[#FAF5EF] border border-[#E8DFC8] rounded-2xl space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-xl bg-[#6E161E]/10 text-[#6E161E] font-bold text-xs flex items-center justify-center shrink-0">
                        {item.number}
                      </span>
                      <p className="text-xs font-semibold text-stone-900 leading-relaxed pt-0.5">
                        {item.text}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#E8DFC8]/60">
                      {/* Rating Buttons */}
                      <div className="flex items-center gap-1.5">
                        {(['S', 'K', 'T', 'H'] as FEDCRating[]).map((r) => {
                          const isPicked = currentRating === r;
                          return (
                            <button
                              key={r}
                              type="button"
                              id={`fedc-btn-${item.id}-${r}`}
                              onClick={() => handleRatingChange(item.id, activeMilestone.id, r)}
                              className={`w-10 h-8 text-xs font-bold rounded-lg border transition-all ${
                                isPicked
                                  ? r === 'S' ? 'bg-emerald-600 text-white border-emerald-600' :
                                    r === 'K' ? 'bg-amber-500 text-white border-amber-500' :
                                    r === 'T' ? 'bg-rose-500 text-white border-rose-500' : 'bg-purple-600 text-white border-purple-600'
                                  : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                              }`}
                            >
                              {r}
                            </button>
                          );
                        })}
                      </div>

                      {/* Age of Mastery Input */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-stone-600 whitespace-nowrap">
                          Dikuasai pada usia:
                        </span>
                        <input
                          type="text"
                          placeholder="e.g. 4 tahun 6 bln"
                          value={resp.masteredAge || ''}
                          onChange={(e) => handleAgeChange(item.id, e.target.value)}
                          className="px-2.5 py-1 text-xs bg-white border border-[#E8DFC8] rounded-lg text-stone-900 w-36 focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Clinical Notes */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Catatan Pengamatan Guru & Rekomendasi Klinis
              </label>
              <textarea
                rows={3}
                value={record.notes || ''}
                onChange={(e) => setRecord({ ...record, notes: e.target.value })}
                placeholder="Tuliskan catatan observasi kualitatif, respon anak saat transisi, dan strategi scaffolding emosional..."
                className="w-full p-3 text-xs bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl text-stone-900 leading-relaxed"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Actions */}
      <div 
        id="fedc-sticky-bar"
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
            id="fedc-save-draft-btn"
            onClick={() => handleSave(false)}
            className="px-5 py-2.5 bg-[#FAF5EF] hover:bg-[#F2EAE0] text-stone-800 text-xs font-bold rounded-xl border border-[#E8DFC8] shadow-2xs transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Draft
          </button>

          <button
            type="button"
            id="fedc-complete-btn"
            onClick={() => handleSave(true)}
            className="px-6 py-2.5 bg-[#6E161E] hover:bg-[#581117] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Complete Observation
          </button>
        </div>
      </div>
    </div>
  );
};
