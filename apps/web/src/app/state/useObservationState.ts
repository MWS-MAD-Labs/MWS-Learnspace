import { useState } from 'react';

export function useObservationState() {
  const [selectedObservationAssignmentId, setSelectedObservationAssignmentId] =
    useState<string | null>(null);
  const [observationResultsStudentId, setObservationResultsStudentId] =
    useState<string | null>(null);
  const [isObservationDrawerOpen, setIsObservationDrawerOpen] = useState(false);

  const toggleObservationDrawer = () => {
    setIsObservationDrawerOpen((open) => !open);
  };

  return {
    selectedObservationAssignmentId,
    setSelectedObservationAssignmentId,
    observationResultsStudentId,
    setObservationResultsStudentId,
    isObservationDrawerOpen,
    setIsObservationDrawerOpen,
    toggleObservationDrawer,
  };
}
