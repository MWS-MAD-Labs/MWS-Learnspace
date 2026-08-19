import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { storageService } from '../../services/storageService';
import { AttendanceRecord, AttendanceStatus, Student } from '../../types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Save,
  CheckCircle2,
  Clock,
  HeartCrack,
  Plane,
  AlertCircle,
  FileText,
  Search,
  CheckCheck,
  X,
} from 'lucide-react';

interface StatusOptionConfig {
  label: string;
  badgeClass: string;
  ringClass: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const STATUS_CONFIG: Record<AttendanceStatus, StatusOptionConfig> = {
  PRESENT: {
    label: 'Present',
    badgeClass:
      'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    ringClass: 'ring-emerald-500/40 border-emerald-500',
    icon: CheckCircle2,
    description: 'On time in class',
  },
  LATE: {
    label: 'Late',
    badgeClass:
      'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    ringClass: 'ring-amber-500/40 border-amber-500',
    icon: Clock,
    description: 'Arrived after bell',
  },
  SICK: {
    label: 'Sick',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
    ringClass: 'ring-rose-500/40 border-rose-500',
    icon: HeartCrack,
    description: 'Medical / illness',
  },
  HOLIDAY: {
    label: 'Holiday',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    ringClass: 'ring-blue-500/40 border-blue-500',
    icon: Plane,
    description: 'Approved leave',
  },
  ABSENCE: {
    label: 'Absence',
    badgeClass: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
    ringClass: 'ring-red-500/40 border-red-500',
    icon: AlertCircle,
    description: 'Unexcused absence',
  },
  EXPLAINED: {
    label: 'Explained',
    badgeClass:
      'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    ringClass: 'ring-purple-500/40 border-purple-500',
    icon: FileText,
    description: 'Permitted absence',
  },
  UNEXPLAINED: {
    label: 'Unexplained',
    badgeClass:
      'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200',
    ringClass: 'ring-stone-400/40 border-stone-400',
    icon: AlertCircle,
    description: 'No reason provided',
  },
};

const AVAILABLE_STATUSES: AttendanceStatus[] = [
  'PRESENT',
  'LATE',
  'SICK',
  'HOLIDAY',
  'ABSENCE',
  'EXPLAINED',
];

export const AttendanceView: React.FC = () => {
  const { students, currentUser, showToast } = useApp();
  const [selectedDate, setSelectedDate] = useState('2026-10-24');
  const [selectedClass, setSelectedClass] = useState('1-A Sequoia');
  const [searchFilter, setSearchFilter] = useState('');

  // Track which student's status popover is currently open
  const [openStudentId, setOpenStudentId] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Available classes extracted from students
  const classOptions = Array.from(
    new Set(students.map((s) => s.className)),
  ).filter(Boolean);
  if (!classOptions.includes('1-A Sequoia'))
    classOptions.unshift('1-A Sequoia');

  // Filter students based on selected class and search query
  const filteredStudents = students.filter((student) => {
    const matchesClass =
      selectedClass === 'ALL' || student.className === selectedClass;
    const matchesSearch =
      !searchFilter ||
      student.fullName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (student.nickname &&
        student.nickname.toLowerCase().includes(searchFilter.toLowerCase()));
    return matchesClass && matchesSearch;
  });

  // Local state for current attendance records mapped by studentId
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});

  // Sync records when date or class changes
  useEffect(() => {
    const existing = storageService.getAttendanceRecords(selectedDate);
    const map: Record<string, AttendanceRecord> = {};

    students.forEach((stu) => {
      const match = existing.find(
        (e) => e.studentId === stu.id && e.date === selectedDate,
      );
      if (match) {
        map[stu.id] = match;
      } else {
        // By default all students are PRESENT
        map[stu.id] = {
          id: `att-${stu.id}-${selectedDate}`,
          studentId: stu.id,
          date: selectedDate,
          status: 'PRESENT',
          className: stu.className,
          recordedBy: currentUser.id,
        };
      }
    });

    setRecords(map);
  }, [selectedDate, students, currentUser.id]);

  // Click-outside listener to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setOpenStudentId(null);
      }
    };
    if (openStudentId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openStudentId]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    const currentRec = records[studentId];
    setRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {
          id: `att-${studentId}-${selectedDate}`,
          studentId,
          date: selectedDate,
          className: selectedClass,
          recordedBy: currentUser.id,
        }),
        status,
        minutesLate:
          status === 'LATE' ? currentRec?.minutesLate || 10 : undefined,
      },
    }));
  };

  const handleMinutesLateChange = (studentId: string, minutes: number) => {
    setRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        minutesLate: minutes,
      },
    }));
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes,
      },
    }));
  };

  const handleMarkAllPresent = () => {
    setRecords((prev) => {
      const updated = { ...prev };
      filteredStudents.forEach((student) => {
        updated[student.id] = {
          ...(updated[student.id] || {
            id: `att-${student.id}-${selectedDate}`,
            studentId: student.id,
            date: selectedDate,
            className: student.className,
            recordedBy: currentUser.id,
          }),
          status: 'PRESENT',
          notes: undefined,
          minutesLate: undefined,
        };
      });
      return updated;
    });
    showToast(
      'info',
      'All Marked Present',
      `Set all ${filteredStudents.length} students to Present.`,
    );
  };

  const handleSaveAttendance = () => {
    const recordsList: AttendanceRecord[] = Object.values(
      records,
    ) as AttendanceRecord[];
    storageService.saveAttendance(recordsList);
    showToast(
      'success',
      'Attendance Saved',
      `Successfully logged attendance for ${recordsList.length} students on ${selectedDate}.`,
    );
  };

  // Date shifting helpers
  const handleShiftDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    const formatted = current.toISOString().split('T')[0];
    setSelectedDate(formatted);
  };

  // Summary counts for current filtered students
  const activeStudentIds = new Set(filteredStudents.map((s) => s.id));
  const allRecordsList: AttendanceRecord[] = Object.values(
    records,
  ) as AttendanceRecord[];
  const activeRecords = allRecordsList.filter((r: AttendanceRecord) =>
    activeStudentIds.has(r.studentId),
  );

  const presentCount = activeRecords.filter(
    (r: AttendanceRecord) => (r.status || 'PRESENT') === 'PRESENT',
  ).length;
  const lateCount = activeRecords.filter(
    (r: AttendanceRecord) => r.status === 'LATE',
  ).length;
  const sickCount = activeRecords.filter(
    (r: AttendanceRecord) => r.status === 'SICK',
  ).length;
  const absenceCount = activeRecords.filter(
    (r: AttendanceRecord) =>
      r.status === 'ABSENCE' || r.status === 'UNEXPLAINED',
  ).length;
  const otherCount = activeRecords.filter(
    (r: AttendanceRecord) => r.status === 'EXPLAINED' || r.status === 'HOLIDAY',
  ).length;

  const formattedDisplayDate = new Date(
    selectedDate + 'T00:00:00',
  ).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      id="attendance-view-container"
      className="space-y-6 max-w-7xl mx-auto pb-12"
    >
      {/* Header & Controls Bar */}
      <div className="bg-white border border-[#EFE7DC] rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6E161E] bg-[#6E161E]/10 px-2.5 py-0.5 rounded-full">
              Class Attendance
            </span>
            <span className="text-xs text-stone-500">
              Academic Year 2026–2027
            </span>
          </div>
          <h1 className="text-2xl font-black font-heading text-stone-900 mt-1">
            Daily Attendance Roster
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Class Selector */}
          <select
            id="attendance-class-select"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3.5 py-2 text-xs font-bold bg-[#FAF5EF] border border-[#E8DFC8] rounded-xl text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-[#6E161E]/20 cursor-pointer"
          >
            {classOptions.map((cls) => (
              <option key={cls} value={cls}>
                Class: {cls}
              </option>
            ))}
            <option value="ALL">All Classes</option>
          </select>

          {/* Date Selector */}
          <div className="flex items-center gap-1 bg-[#FAF5EF] border border-[#E8DFC8] p-1 rounded-xl">
            <button
              onClick={() => handleShiftDate(-1)}
              className="p-1.5 hover:bg-stone-200/60 rounded-lg text-stone-600 transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 px-2">
              <CalendarIcon className="w-3.5 h-3.5 text-[#6E161E] shrink-0" />
              <span className="text-xs font-bold text-stone-800 whitespace-nowrap">
                {formattedDisplayDate}
              </span>
            </div>
            <button
              onClick={() => handleShiftDate(1)}
              className="p-1.5 hover:bg-stone-200/60 rounded-lg text-stone-600 transition-colors"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Mark All Present */}
          <button
            id="attendance-mark-all-btn"
            onClick={handleMarkAllPresent}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
            title="Reset all students to Present"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Mark All</span> Present
          </button>

          {/* Save Button */}
          <button
            id="attendance-save-btn"
            onClick={handleSaveAttendance}
            className="px-4 py-2 bg-[#6E161E] hover:bg-[#581117] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      {/* Minimal Stat Strip & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Counter Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Present:</span>
            <span className="font-extrabold text-emerald-950">
              {presentCount}
            </span>
          </div>
          {lateCount > 0 && (
            <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Late:</span>
              <span className="font-extrabold text-amber-950">{lateCount}</span>
            </div>
          )}
          {sickCount > 0 && (
            <div className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Sick:</span>
              <span className="font-extrabold text-rose-950">{sickCount}</span>
            </div>
          )}
          {absenceCount > 0 && (
            <div className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span>Absence:</span>
              <span className="font-extrabold text-red-950">
                {absenceCount}
              </span>
            </div>
          )}
          {otherCount > 0 && (
            <div className="px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-800 rounded-xl flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              <span>Other:</span>
              <span className="font-extrabold text-purple-950">
                {otherCount}
              </span>
            </div>
          )}
          <span className="text-stone-400 font-medium text-xs ml-1">
            Total: {filteredStudents.length} students
          </span>
        </div>

        {/* Filter Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E8DFC8] rounded-xl text-stone-800 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[#6E161E]/20"
          />
          {searchFilter && (
            <button
              onClick={() => setSearchFilter('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Minimalist Student Grid */}
      <div
        id="attendance-student-grid"
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
      >
        {filteredStudents.map((student: Student) => {
          const rec = records[student.id];
          const currentStatus: AttendanceStatus = rec?.status || 'PRESENT';
          const config = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.PRESENT;
          const StatusIcon = config.icon;
          const isMenuOpen = openStudentId === student.id;

          return (
            <div
              key={student.id}
              id={`attendance-grid-card-${student.id}`}
              className={`relative bg-white border rounded-2xl p-4 flex flex-col items-center text-center transition-all duration-200 shadow-xs hover:shadow-md ${
                isMenuOpen
                  ? 'border-[#6E161E] ring-2 ring-[#6E161E]/15 z-30'
                  : 'border-[#EFE7DC] hover:border-stone-300'
              }`}
            >
              {/* Profile Picture */}
              <div className="relative group">
                <img
                  src={
                    student.avatarUrl ||
                    'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=150&auto=format&fit=crop&q=80'
                  }
                  alt={student.fullName}
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 shadow-xs transition-transform duration-200 group-hover:scale-105 ${config.ringClass}`}
                />
                {/* Micro status icon badge on avatar */}
                <div
                  className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-white shadow-xs ${
                    currentStatus === 'PRESENT'
                      ? 'bg-emerald-600 text-white'
                      : currentStatus === 'LATE'
                        ? 'bg-amber-500 text-white'
                        : currentStatus === 'SICK'
                          ? 'bg-rose-500 text-white'
                          : currentStatus === 'ABSENCE'
                            ? 'bg-red-600 text-white'
                            : 'bg-purple-600 text-white'
                  }`}
                >
                  <StatusIcon className="w-3 h-3" />
                </div>
              </div>

              {/* Student Name */}
              <div className="mt-3 w-full">
                <h3
                  className="text-sm font-bold text-stone-900 truncate px-1"
                  title={student.fullName}
                >
                  {student.fullName}
                </h3>
              </div>

              {/* Active Status Button (Click to change status) */}
              <div className="mt-3 w-full">
                <button
                  id={`status-toggle-${student.id}`}
                  onClick={() =>
                    setOpenStudentId(isMenuOpen ? null : student.id)
                  }
                  className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 shadow-2xs ${config.badgeClass}`}
                  title="Click to change status"
                >
                  <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{config.label}</span>
                  {currentStatus === 'LATE' && rec?.minutesLate && (
                    <span className="text-[10px] opacity-80">
                      ({rec.minutesLate}m)
                    </span>
                  )}
                  <ChevronDown
                    className={`w-3 h-3 shrink-0 opacity-60 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>

              {/* Minimal Popover Menu for Changing Status */}
              {isMenuOpen && (
                <div
                  ref={popoverRef}
                  id={`status-menu-${student.id}`}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 sm:w-72 bg-white border border-[#E8DFC8] rounded-2xl shadow-xl p-3 z-50 text-left animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100">
                    <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                      Set Status for{' '}
                      {student.nickname || student.fullName.split(' ')[0]}
                    </span>
                    <button
                      onClick={() => setOpenStudentId(null)}
                      className="p-1 text-stone-400 hover:text-stone-600 rounded-md"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Status Options Grid */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {AVAILABLE_STATUSES.map((st) => {
                      const isSelected = currentStatus === st;
                      const optConfig = STATUS_CONFIG[st];
                      const OptIcon = optConfig.icon;

                      return (
                        <button
                          key={st}
                          id={`select-status-${student.id}-${st.toLowerCase()}`}
                          onClick={() => {
                            handleStatusChange(student.id, st);
                            if (
                              st !== 'LATE' &&
                              st !== 'SICK' &&
                              st !== 'ABSENCE' &&
                              st !== 'EXPLAINED'
                            ) {
                              setOpenStudentId(null);
                            }
                          }}
                          className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold border transition-all text-left ${
                            isSelected
                              ? `${optConfig.badgeClass} ring-2 ring-[#6E161E]/20`
                              : 'bg-[#FAF6F0] border-transparent hover:border-stone-200 text-stone-700'
                          }`}
                        >
                          <OptIcon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{optConfig.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Contextual input for Late */}
                  {currentStatus === 'LATE' && (
                    <div className="mt-2.5 pt-2.5 border-t border-stone-100 bg-amber-50/60 p-2.5 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-900 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-700" />
                          Minutes Late:
                        </span>
                        <input
                          type="number"
                          min="1"
                          max="180"
                          value={rec?.minutesLate || 10}
                          onChange={(e) =>
                            handleMinutesLateChange(
                              student.id,
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="w-16 px-2 py-0.5 text-xs bg-white border border-amber-300 rounded-lg text-stone-900 font-bold focus:outline-hidden text-right"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Reason (optional)..."
                        value={rec?.notes || ''}
                        onChange={(e) =>
                          handleNotesChange(student.id, e.target.value)
                        }
                        className="w-full px-2.5 py-1 text-xs bg-white border border-amber-300 rounded-lg text-stone-800 focus:outline-hidden placeholder-stone-400"
                      />
                    </div>
                  )}

                  {/* Contextual input for Sick / Absence / Explained */}
                  {(currentStatus === 'SICK' ||
                    currentStatus === 'ABSENCE' ||
                    currentStatus === 'EXPLAINED' ||
                    currentStatus === 'HOLIDAY') && (
                    <div className="mt-2.5 pt-2.5 border-t border-stone-100 bg-stone-50 p-2.5 rounded-xl space-y-1.5">
                      <span className="text-[11px] font-bold text-stone-600 block">
                        Remarks / Reason (Optional):
                      </span>
                      <input
                        type="text"
                        placeholder="e.g. Doctor note / Fever / Family event..."
                        value={rec?.notes || ''}
                        onChange={(e) =>
                          handleNotesChange(student.id, e.target.value)
                        }
                        className="w-full px-2.5 py-1 text-xs bg-white border border-stone-300 rounded-lg text-stone-800 focus:outline-hidden placeholder-stone-400"
                      />
                    </div>
                  )}

                  {/* Done button to close popover */}
                  <div className="mt-2.5 pt-2 border-t border-stone-100 flex justify-end">
                    <button
                      onClick={() => setOpenStudentId(null)}
                      className="px-3 py-1 bg-[#6E161E] text-white text-xs font-bold rounded-lg hover:bg-[#581117] transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State when search has no results */}
      {filteredStudents.length === 0 && (
        <div className="bg-white border border-[#EFE7DC] rounded-3xl p-12 text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-stone-900">
            No students found
          </h4>
          <p className="text-xs text-stone-500 mt-1">
            No students match your selected class and search filter.
          </p>
          <button
            onClick={() => {
              setSelectedClass('ALL');
              setSearchFilter('');
            }}
            className="mt-4 px-4 py-2 bg-[#6E161E] text-white text-xs font-bold rounded-xl"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};
