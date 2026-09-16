export function validateRegistrationForm(formData, memberType) {
  const errors = {};

  // ชื่อ-นามสกุล
  if (!formData.fullName || formData.fullName.trim().length < 3) {
    errors.fullName = 'กรุณากรอกชื่อ-นามสกุล ภาษาไทยให้ถูกต้อง';
  }

  // รหัสนักศึกษา / รหัสบุคลากร
  if (memberType === 'student') {
    if (!formData.studentId || !/^\d{8}$/.test(formData.studentId.trim())) {
      errors.studentId = 'กรุณากรอกรหัสนักศึกษาให้ครบ 8 หลัก (เฉพาะตัวเลข)';
    }
  } else {
    if (!formData.studentId || formData.studentId.trim().length < 4) {
      errors.studentId = 'กรุณากรอกรหัสประจำตัวอาจารย์/บุคลากร';
    }
  }

  // คณะ / ภาควิชา
  if (!formData.faculty) {
    errors.faculty = 'กรุณาเลือกคณะ / ภาควิชาของคุณ';
  }

  // อีเมลมหาวิทยาลัย (@spu.ac.th)
  if (!formData.email) {
    errors.email = 'กรุณากรอกอีเมลมหาวิทยาลัย';
  } else if (!/^[^\s@]+@spu\.ac\.th$/i.test(formData.email.trim())) {
    errors.email = 'อีเมลต้องลงท้ายด้วย @spu.ac.th เท่านั้น';
  }

  // ช่องทางติดต่อ LINE ID หรือ เบอร์โทรศัพท์
  if (!formData.contact || formData.contact.trim().length < 3) {
    errors.contact = 'กรุณากรอก LINE ID หรือเบอร์โทรศัพท์ที่ติดต่อได้';
  }

  // รูปภาพบัตร
  if (!formData.idCardImage) {
    errors.idCardImage = 'กรุณาอัปโหลดรูปภาพบัตรเพื่อยืนยันตัวตน';
  }

  // PDPA Consent
  if (!formData.consent1) {
    errors.consent1 = 'กรุณายินยอมให้ตรวจสอบสถานะกับระบบมหาวิทยาลัย';
  }
  if (!formData.consent2) {
    errors.consent2 = 'กรุณายอมรับข้อตกลงการซื้อขายที่ปลอดภัย';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
