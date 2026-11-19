export const getBangkokParts = (date = new Date()) => Object.fromEntries(
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).filter((part) => part.type !== 'literal').map(({ type, value }) => [type, value]),
);

export const getBangkokScheduleLimits = () => {
  const now = getBangkokParts();
  const today = `${now.year}-${now.month}-${now.day}`;
  const maxDateObj = new Date(Date.UTC(Number(now.year), Number(now.month) - 1, Number(now.day) + 7));
  const maxDate = `${maxDateObj.getUTCFullYear()}-${String(maxDateObj.getUTCMonth() + 1).padStart(2, '0')}-${String(maxDateObj.getUTCDate()).padStart(2, '0')}`;
  const currentTime = `${now.hour}:${now.minute}`;
  const afterPickupHours = currentTime >= '18:00';
  let minTime = '08:00';
  if (!afterPickupHours && currentTime >= '08:00') {
    const min = new Date(Date.UTC(2000, 0, 1, Number(now.hour), Number(now.minute) + 1));
    minTime = `${String(min.getUTCHours()).padStart(2, '0')}:${String(min.getUTCMinutes()).padStart(2, '0')}`;
  }
  return { minDate: today, maxDate, minTime, afterPickupHours };
};

export const getDefaultBangkokPickupDateTime = () => {
  const now = getBangkokParts();
  const totalMinutes = Number(now.hour) * 60 + Number(now.minute) + 60;
  const clampedMinutes = Math.min(18 * 60, Math.max(8 * 60, totalMinutes));
  return new Date(
    Number(now.year),
    Number(now.month) - 1,
    Number(now.day),
    Math.floor(clampedMinutes / 60),
    clampedMinutes % 60,
    0,
    0,
  );
};

// The picker returns wall-clock fields; store them as an explicit Thailand offset.
export const toBangkokIsoString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}:00+07:00`;
};

export const fromIsoToBangkokPickerDate = (isoString) => {
  if (!isoString) return getDefaultBangkokPickupDateTime();
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime()) || parsed <= new Date()) {
    return getDefaultBangkokPickupDateTime();
  }
  const parts = getBangkokParts(parsed);
  return new Date(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    0,
    0,
  );
};

export const validateBangkokPickupDateTime = (scheduledDateTime) => {
  const scheduledAt = scheduledDateTime ? new Date(toBangkokIsoString(scheduledDateTime)) : null;
  const scheduledWall = scheduledDateTime ? toBangkokIsoString(scheduledDateTime) : '';
  const { minDate, maxDate, minTime, afterPickupHours } = getBangkokScheduleLimits();
  const scheduledDate = scheduledWall.slice(0, 10);
  const scheduledTime = scheduledWall.slice(11, 16);
  const beforeEarliestTime = scheduledTime < '08:00' || (!afterPickupHours && scheduledDate === minDate && scheduledTime < minTime);
  const inPastDuringHours = scheduledDate === minDate && !afterPickupHours && scheduledAt && scheduledAt <= new Date();
  if (!scheduledAt || Number.isNaN(scheduledAt.getTime()) || scheduledDate < minDate || scheduledDate > maxDate || beforeEarliestTime || scheduledTime > '18:00' || inPastDuringHours) {
    return { valid: false, scheduledAt: null, error: 'กรุณาเลือกเวลานัดรับระหว่าง 08:00 - 18:00 น. (เวลาไทย)' };
  }
  return { valid: true, scheduledAt, error: '' };
};
