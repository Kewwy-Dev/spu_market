export const FACULTIES = [
  {
    id: 'entrepreneurship',
    name: 'คณะการสร้างเจ้าของธุรกิจ',
    majors: [
      'การเป็นเจ้าของธุรกิจและสร้างสรรค์นวัตกรรม',
    ],
  },
  {
    id: 'digital-media',
    name: 'คณะดิจิทัลมีเดีย',
    majors: [
      'ดิจิทัลอาร์ตส์',
      'คอมพิวเตอร์แอนิเมชันและวิชวลเอฟเฟกต์',
      'การออกแบบอินเทอร์แอคทีฟและเกม',
      'การออกแบบกราฟิก',
    ],
  },
  {
    id: 'comm-arts',
    name: 'คณะนิเทศศาสตร์',
    majors: [
      'การสร้างสรรค์อีเวนต์และการจัดการอุตสาหกรรมบันเทิง',
      'การออกแบบสื่อสารออนไลน์',
      'สื่อสารการแสดง',
      'ภาพยนตร์และสื่อดิจิทัล',
    ],
  },
  {
    id: 'business',
    name: 'คณะบริหารธุรกิจ',
    majors: [
      'ธุรกิจระหว่างประเทศ',
      'ธุรกิจระหว่างประเทศ Plus : โลจิสติกส์นำเข้า-ส่งออก',
      'การบริหารและการจัดการสมัยใหม่',
      'การตลาดดิจิทัล',
      'บริหารธุรกิจ',
      'บริหารธุรกิจ (มุ่งเน้นการเงินและการลงทุน)',
      'การจัดการธุรกิจ (หลักสูตรนานาชาติ)',
      'ธุรกิจระหว่างประเทศ x การบริหารและการจัดการสมัยใหม่ (2 ปริญญา)',
      'ธุรกิจระหว่างประเทศ x บริหารธุรกิจ (2 ปริญญา)',
      'ธุรกิจระหว่างประเทศ x การตลาดดิจิทัล (2 ปริญญา)',
    ],
  },
  {
    id: 'it',
    name: 'คณะเทคโนโลยีสารสนเทศ',
    majors: [
      'วิทยาการคอมพิวเตอร์และนวัตกรรมการพัฒนาซอฟต์แวร์',
      'เทคโนโลยีสารสนเทศและการสื่อสาร',
      'วิศวกรรมคอมพิวเตอร์',
    ],
  },
  {
    id: 'aviation-tourism-hospitality',
    name: 'วิทยาลัยการบิน การท่องเที่ยวและการบริการ',
    majors: [
      'ธุรกิจการบิน',
      'ธุรกิจการบิน (หลักสูตรนานาชาติ)',
      'การจัดการบริการธุรกิจเรือสำราญ',
      'การจัดการธุรกิจโรงแรมและการออกแบบประสบการณ์ท่องเที่ยว',
    ],
  },
  {
    id: 'logistics-aviation-smart-mobility',
    name: 'วิทยาลัยโลจิสติกส์ การบิน และสมาร์ทโมบิลิตี้',
    majors: [
      'การจัดการโลจิสติกส์และโซ่อุปทาน',
      'การจัดการโลจิสติกส์และโซ่อุปทาน x ธุรกิจระหว่างประเทศ',
      'การจัดการความปลอดภัยการบิน',
    ],
  },
  {
    id: 'liberal-arts',
    name: 'คณะศิลปศาสตร์',
    majors: [
      'ภาษาอังกฤษสื่อสารธุรกิจ',
      'ภาษาญี่ปุ่นเพื่อการสื่อสารธุรกิจ',
      'ภาษาจีนสื่อสารธุรกิจ',
    ],
  },
  {
    id: 'design-architecture',
    name: 'คณะการออกแบบและสถาปัตยกรรมศาสตร์',
    majors: [
      'สถาปัตยกรรม',
      'การออกแบบภายใน',
    ],
  },
  {
    id: 'accountancy',
    name: 'คณะบัญชี',
    majors: [
      'การบัญชี',
    ],
  },
  {
    id: 'law',
    name: 'คณะนิติศาสตร์',
    majors: [
      'นิติศาสตร์',
    ],
  },
  {
    id: 'international-college',
    name: 'Sripatum University International College',
    majors: [
      'Business Administration',
      'International Airline Business',
      'UK Degree Pathway Programme',
    ],
  },
  {
    id: 'global-design-academy',
    name: 'SPU The Global Design Academy',
    majors: [
      'Bachelor of Fine Applied Arts in Game & Interactive Media (GDA)',
      'Bachelor of Business Administration in Brand & Fashion Entrepreneurship (GDA)',
    ],
  },
  {
    id: 'engineering',
    name: 'คณะวิศวกรรมศาสตร์',
    majors: [
      'วิศวกรรมไฟฟ้า',
      'วิศวกรรมโยธา',
      'วิศวกรรมเครื่องกล',
      'วิศวกรรมอุตสาหการและการจัดการ',
      'วิศวกรรมระบบราง (ทุนแลกเปลี่ยนเรียนที่จีน 1 ปี)',
      'วิศวกรรมหุ่นยนต์และระบบอัตโนมัติ',
    ],
  },
];

export function getMajorsByFaculty(facultyName) {
  if (!facultyName) return [];
  const matched = FACULTIES.find((faculty) => faculty.name === facultyName);
  return matched ? matched.majors : [];
}

export function isMajorInFaculty(facultyName, majorName) {
  if (!facultyName || !majorName) return false;
  return getMajorsByFaculty(facultyName).includes(majorName);
}
