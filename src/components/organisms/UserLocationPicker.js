import React, { useState, useEffect, useRef } from "react";
import { useGetLocation, useSetLocation } from "@/hooks/useLocation";
import LocationPicker from "@/components/organisms/LocationPicker";

export default function UserLocationPicker({ editMode = true, onChange, onModalOpen, onModalClose, label }) {
  const getLocation = useGetLocation();
  const setLocationStorage = useSetLocation();
  const [location, setLocation] = useState(() => getLocation() ?? null);
  const onChangeRef = useRef(onChange);
  const didNotifyMountRef = useRef(false);

  // Keep the ref up to date
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Notify parent of stored location once (no setState)
  useEffect(() => {
    if (didNotifyMountRef.current) return;
    didNotifyMountRef.current = true;
    if (location && onChangeRef.current) onChangeRef.current(location);
  }, [location]);

  const handleChange = (loc) => {
    setLocation(loc);
    setLocationStorage(loc);
    if (onChangeRef.current) onChangeRef.current(loc);
  };

  return (
    <LocationPicker
      value={location}
      onChange={handleChange}
      editMode={editMode}
      {...(label ? { label } : {})}
      onModalOpen={onModalOpen}
      onModalClose={onModalClose}
    />
  );
}
