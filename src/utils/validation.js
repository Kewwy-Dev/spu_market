import { getMajorsByFaculty } from '../data/faculties';

export const ALLOWED_SPU_EMAIL_DOMAINS = ['@spumail.net', '@spu.ac.th'];
const SPU_EMAIL_PATTERN = /^[^\s@]+@(spumail\.net|spu\.ac\.th)$/i;
const FULL_NAME_PATTERN = /^[A-Za-z\u0E00-\u0E7F\s]+$/;
const THAI_CHAR_PATTERN = /[\u0E00-\u0E7F]/;

export function isAllowedSpuEmail(email) {
  if (typeof email !== 'string') return false;
  return SPU_EMAIL_PATTERN.test(email.trim());
}

export function validateRegistrationForm(formData, memberType) {
  const errors = {};
  const trimmedFullName = formData.fullName?.trim() || '';

  if (!trimmedFullName || trimmedFullName.length < 3) {
    errors.fullName = 'กรุณากรอกชื่อ-สกุลให้ครบถ้วน';
  } else if (!FULL_NAME_PATTERN.test(trimmedFullName)) {
    errors.fullName = 'ชื่อ-สกุลต้องเป็นภาษาไทยหรือภาษาอังกฤษเท่านั้น ห้ามมีตัวเลขหรืออักษรพิเศษ';
  }

  if (memberType === 'student') {
    if (!/^\d{8}$/.test(formData.studentId?.trim() || '')) errors.studentId = 'รหัสนักศึกษาต้องมีตัวเลข 8 หลัก';
  } else if (!formData.studentId?.trim() || formData.studentId.trim().length < 4) {
    errors.studentId = 'กรุณากรอกรหัสอาจารย์หรือบุคลากร';
  }

  if (!formData.faculty) {
    errors.faculty = 'กรุณาเลือกคณะ / วิทยาลัย';
  } else {
    const majors = getMajorsByFaculty(formData.faculty);
    if (majors.length > 0 && !formData.major) {
      errors.major = 'กรุณาเลือกสาขาวิชา';
    } else if (majors.length > 0 && !majors.includes(formData.major)) {
      errors.major = 'กรุณาเลือกสาขาวิชาที่ตรงกับคณะที่เลือก';
    }
  }

  if (!formData.email) errors.email = 'กรุณากรอกอีเมลมหาวิทยาลัย';
  else if (!/^[^\s@]+@spumail\.net$/i.test(formData.email.trim())) errors.email = 'อีเมลต้องลงท้ายด้วย @spumail.net';

  const trimmedContact = formData.contact?.trim() || '';
  if (!trimmedContact || trimmedContact.length < 3) {
    errors.contact = 'กรุณากรอกช่องทางติดต่อ';
  } else if (THAI_CHAR_PATTERN.test(trimmedContact)) {
    errors.contact = 'ช่องทางติดต่อห้ามมีภาษาไทย';
  }
  if (!formData.consent1) errors.consent1 = 'กรุณายินยอมให้ตรวจสอบสถานะนักศึกษาหรือบุคลากร';
  if (!formData.consent2) errors.consent2 = 'กรุณายอมรับข้อกำหนดการซื้อขาย';

  return { isValid: Object.keys(errors).length === 0, errors };
}
