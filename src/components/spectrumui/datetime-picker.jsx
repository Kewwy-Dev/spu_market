import React, { useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';

const dateString = (year, month, day) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
const dateValue = (date) => date ? dateString(date.getFullYear(), date.getMonth() + 1, date.getDate()) : '';
const timeValue = (date) => date ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : '';

function addDays(dayStr, days) {
  const [year, month, day] = dayStr.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return dateString(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

function diffDays(fromStr, toStr) {
  const [y1, m1, d1] = fromStr.split('-').map(Number);
  const [y2, m2, d2] = toStr.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

function clampTime(time, minTime, maxTime) {
  if (!time) return maxTime;
  if (time < minTime) return minTime;
  if (time > maxTime) return maxTime;
  return time;
}

function defaultTimePlusOneHour(minTime, maxTime) {
  const now = new Date();
  const totalMinutes = now.getHours() * 60 + now.getMinutes() + 60;
  const hour = Math.min(23, Math.floor(totalMinutes / 60));
  const minute = totalMinutes >= 24 * 60 ? 59 : totalMinutes % 60;
  const candidate = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return clampTime(candidate, minTime, maxTime);
}

function makeLocalDate(day, time) {
  if (!day || !time) return undefined;
  const [year, month, date] = day.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(year, month - 1, date, hour, minute, 0, 0);
}

function thaiLabel(date, options) {
  const wallTimeAsUtc = new Date(Date.UTC(
    date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(),
  ));
  return new Intl.DateTimeFormat('th-TH', { timeZone: 'UTC', ...options }).format(wallTimeAsUtc);
}

export default function DateTimePicker({ value, onChange, minDate, minTime = '08:00', maxTime = '18:00', disabled = false }) {
  const effectiveMinTime = minTime && minTime > '08:00' ? minTime : '08:00';
  const effectiveMaxTime = maxTime && maxTime < '18:00' ? maxTime : '18:00';
  const todayStr = minDate || dateValue(new Date());

  const [selectedDate, setSelectedDate] = useState(() => dateValue(value) || todayStr);
  const [selectedTime, setSelectedTime] = useState(() => (
    value ? clampTime(timeValue(value), effectiveMinTime, effectiveMaxTime) : defaultTimePlusOneHour(effectiveMinTime, effectiveMaxTime)
  ));
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const nextDate = dateValue(value) || todayStr;
    const nextTime = value
      ? clampTime(timeValue(value), effectiveMinTime, effectiveMaxTime)
      : defaultTimePlusOneHour(effectiveMinTime, effectiveMaxTime);
    setSelectedDate(nextDate);
    setSelectedTime(nextTime);
    if (!value) {
      const initialValue = makeLocalDate(nextDate, nextTime);
      if (initialValue) onChange?.(initialValue);
    }
  }, [value, todayStr, effectiveMinTime, effectiveMaxTime]);

  const updateValue = (nextDate, nextTime) => {
    const nextValue = makeLocalDate(nextDate, nextTime);
    if (nextValue) onChange?.(nextValue);
  };

  const chooseTime = (event) => {
    const nextTime = event.target.value;
    setSelectedTime(nextTime);
    updateValue(selectedDate, nextTime);
  };

  const dayOffset = Math.max(0, Math.min(7, diffDays(todayStr, selectedDate)));

  const shiftDate = (delta) => {
    const nextOffset = Math.max(0, Math.min(7, dayOffset + delta));
    const nextDate = addDays(todayStr, nextOffset);
    setSelectedDate(nextDate);
    updateValue(nextDate, selectedTime);
  };

  const activeDateObj = makeLocalDate(selectedDate, selectedTime) || new Date();
  const activeDateLabel = thaiLabel(activeDateObj, { day: 'numeric', month: 'long', year: 'numeric' });
  const dayPrefix = dayOffset === 0 ? 'วันนี้' : dayOffset === 1 ? 'พรุ่งนี้' : '';
  const selectedLabel = value
    // dateStyle cannot be combined with individual time fields in Intl.DateTimeFormat.
    ? thaiLabel(value, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    : `${activeDateLabel} ${selectedTime}`;

  return (
    <div className="spectrum-datetime-picker">
      <button
        type="button"
        className={`spectrum-datetime-trigger ${value ? 'has-value' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
      >
        <CalendarDays size={17} />
        <span>{selectedLabel}</span>
        <Clock3 size={16} className="spectrum-datetime-trigger-clock" />
      </button>

      {isOpen && <div className="spectrum-datetime-popover" role="dialog" aria-label="เลือกเวลานัดรับ">
        <div className="spectrum-active-date-badge">
          {dayOffset > 0 && (
            <button
              type="button"
              className="spectrum-date-nav-btn"
              aria-label="วันก่อนหน้า"
              disabled={disabled}
              onClick={() => shiftDate(-1)}
            >
              <ChevronLeft size={15} />
            </button>
          )}
          <span className="spectrum-active-date-label">
            <CalendarDays size={15} />
            <span>{dayPrefix ? `${dayPrefix} · ` : ''}{activeDateLabel}</span>
          </span>
          <button
            type="button"
            className="spectrum-date-nav-btn"
            aria-label="วันถัดไป"
            disabled={disabled || dayOffset >= 7}
            onClick={() => shiftDate(1)}
          >
            <ChevronRight size={15} />
          </button>
        </div>
        <div className="spectrum-time-row">
          <label htmlFor="pickup-schedule-time"><Clock3 size={15} /> เวลานัดรับ</label>
          <input
            id="pickup-schedule-time"
            type="time"
            lang="th-TH"
            required
            disabled={disabled}
            step={60}
            value={selectedTime}
            onChange={chooseTime}
          />
        </div>
        <p className="spectrum-time-hint">กรุณาเลือกเวลา 08:00 - 18:00 น.</p>
      </div>}
    </div>
  );
}
